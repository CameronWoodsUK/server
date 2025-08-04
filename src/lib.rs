pub mod threads {
    use std::{
        sync::{mpsc, Arc, Mutex},
        thread,
    };

    pub struct ThreadPool {
        workers: Vec<Worker>,
        sender: Option<mpsc::Sender<Job>>,
    }
    type Job = Box<dyn FnOnce() + Send + 'static>;
    
    impl ThreadPool {
        pub fn new(size: usize) -> ThreadPool {
            assert!(size > 0);
    
            let (sender, receiver) = mpsc::channel();
    
            let receiver = Arc::new(Mutex::new(receiver));
    
            let mut workers = Vec::with_capacity(size);
    
            for id in 0..size {
                workers.push(Worker::new(id, Arc::clone(&receiver)));
            }
    
            ThreadPool {
                workers,
                sender: Some(sender),
            }
        }
    
        pub fn execute<F>(&self, f: F)
        where
            F: FnOnce() + Send + 'static,
        {
            let job = Box::new(f);
            self.sender.as_ref().unwrap().send(job).unwrap();
        }
    }
    
    impl Drop for ThreadPool {
        fn drop(&mut self) {
            drop(self.sender.take());
    
            for worker in &mut self.workers {
                println!("Shutting down worker {}", worker.id);
    
                if let Some(thread) = worker.thread.take() {
                    thread.join().unwrap_or_else(|e| {println!("ooooh aaaah something went quite wrong with threading: {:#?}", e)});
                }
            }
        }
    }
    
    struct Worker {
        id: usize,
        thread: Option<thread::JoinHandle<()>>,
    }
    impl Worker {
        fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
            let thread = thread::spawn(move || loop {
                let message = receiver.lock().unwrap().recv();
    
                match message {
                    Ok(job) => {
                        //println!("Worker {id} got a job; executing.");
    
                        job();
                    }
                    Err(_) => {
                        //println!("Worker {id} disconnected; shutting down.");
                        break;
                    }
                }
            });
    
            Worker {
                id,
                thread: Some(thread),
            }
        }
    }
    
}

pub mod http {
    use std::{
        env::current_dir, fs::{self, File}, io::{prelude::*, BufReader, Read}, net::TcpStream, path::Path, sync::Arc, time::Duration
    };
    use url::Url;
    use rustls::{pki_types::ServerName, ClientConfig, ClientConnection, RootCertStore, Stream};
    use flate2::read::{GzDecoder, DeflateDecoder};
    use brotli::Decompressor;

    enum TlsOrTcp {
        Tls{
            conn: ClientConnection,
            stream: TcpStream
        },
        Tcp(TcpStream)
    }
    impl Read for TlsOrTcp {
        fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
            match self {
                TlsOrTcp::Tls { conn, stream } => {
                    let mut wrapper = Stream::new(conn, stream);
                    wrapper.read(buf)
                },
                TlsOrTcp::Tcp(s) => s.read(buf)
            }
        }
    }
    impl Write for TlsOrTcp {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            match self {
                TlsOrTcp::Tls { conn, stream } => {
                    let mut wrapper = Stream::new(conn, stream);
                    wrapper.write(buf)
                },
                TlsOrTcp::Tcp(s) => s.write(buf)
            }
        }
        fn flush(&mut self) -> std::io::Result<()> {
            match self {
                TlsOrTcp::Tls { conn, stream } => {
                    let mut wrapper = Stream::new(conn, stream);
                    wrapper.flush()
                },
                TlsOrTcp::Tcp(s) => s.flush()
            }
        }
    }

    pub fn handle_connection(mut stream: TcpStream) {
        let (request_line, headers, body) = parse_stream(stream.try_clone().unwrap());
    
        if request_line.len() == 0 {
            return;
        }

        let request_parts = request_line.split_whitespace().collect::<Vec<&str>>();
        let (method, path) = (request_parts[0], request_parts[1]);
        println!("{}", path);
        
        // added some stuff for a proxy. can use on [MY DOMAIN]/proxy/[WHATEVER AM ACCESSING]
        if path.contains("/proxy/") {
            let path = path.split("/proxy/").nth(1).unwrap();
            let response = handle_proxy_request(&method, &path, &headers, &body);
            
            if let Err(e) = stream.write_all(response.as_bytes()) {
                println!("Error writing response: {}", e);
            }
            return;
        }

        // this stuff looks for a certain header from cloudflare bc thats how my https connections work
        let forwarded_proto = headers.lines().find(|&line| line.starts_with("X-Forwarded-Proto:")).map(|line| line.split(": ").nth(1).unwrap_or("default").trim());
        println!("{}", forwarded_proto.unwrap_or("idk wtf"));
        if forwarded_proto == Some("http") {
            let response = format!("HTTP/1.1 301 Moved Permanently\r\nLocation: https://cameronwoods.lol\r\nContent-Length: 0\r\nConnection: Close\r\n\r\n");
            println!("Redirected to a secure connection");

            if let Err(e) = stream.write_all(&response.as_bytes()) {
                println!("Error writing response: {}", e);
            }
            return;
        }

        // normally i just handle GET requests but i've added a proto-functionality for POST
        if method == "GET" {
            let response = create_response(&request_line);
    
            if let Err(e) = stream.write_all(&response[..]) {
                println!("Error writing response: {}", e);
            }
        } else if method == "POST" {
            let response = format!("HTTP/1.1 205 Reset Content\r\nContent-Type: text/html\r\nContent-Length: 0");
            println!("Client wants you to do something with: {}", body);
    
            if let Err(e) = stream.write_all(&response.as_bytes()) {
                println!("Error writing response: {}", e);
            }
        }
    }
    
    fn create_response(request: &str) -> Vec<u8> {
        let page = request.split_whitespace().nth(1).unwrap_or("");
        let filename = if page == "/" {
            format!("{}/home.html", root()).to_string()
        } else if !page.contains(".") {
            format!(
                "{}/{}.html",
                root(),
                page[1..].to_string()
            )
        } else {
            format!(
                "{}/{}",
                root(),
                page[1..].to_string()
            )
        };
    
        let (status_line, contents) = if Path::new(&filename).exists() {
            (
                "HTTP/1.1 200 OK".to_string(),
                fs::read(filename).unwrap()
            )
        } else {
            (
                "HTTP/1.1 404 Not Found".to_string(),
                fs::read(format!("{}/404.html", root())).unwrap()
            )
        };
    
        let filename = if page == "/" {
            "home.html".to_string()
        } else if !page.contains(".") {
            page[1..].to_string() + ".html"
        } else {
            page[1..].to_string()
        };
        
        const IMAGE_TYPES: [&str; 4] = [".png", ".ico", ".gif", ".svg"];
        let content_type = if !status_line.contains("OK") || filename.contains(".html") {
            "text/html".to_string()
        } else if filename.contains(".css") {
            "text/css".to_string()
        } else if filename.contains(".js") {
            "application/javascript".to_string()
        } else if IMAGE_TYPES.iter().any(|&t| filename.contains(t)){
            "image".to_string()
        } else if filename.contains(".mp4") {
            "video/mp4".to_string()
        } else {
            "text/html".to_string()
        };
        
        let cache_headers = "Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\nPragma: no-cache\r\nExpires: 0".to_string();

        let mut response: Vec<u8>;
        let length = contents.len();
    
        response = format!("{status_line}\r\nContent-Type: {content_type}\r\nContent-Length: {length}\r\nConnection: keep-alive\r\n{cache_headers}\r\n\r\n").into_bytes();
        response.extend(contents);
    
        response
    }

    fn handle_proxy_request(_method: &str, url_str: &str, original_headers: &str, original_body: &str) -> String {
        // Parse URL
        let target_url = url_str.strip_prefix("/proxy/").unwrap_or(url_str);
        println!("{}", target_url);
        let url_ready = if target_url.starts_with("http://") || target_url.starts_with("https://") {
            target_url.to_string()
        } else {
            format!("http://{}", target_url)
        };
        println!("ACCESSING: {}", url_ready);
        let url = Url::parse(&url_ready).map_err(|e| format!("URL parse error: {}", e)).unwrap();
        let domain = url.host_str().ok_or("Failed to extract host from URL").unwrap().to_string();
        let port = url.port_or_known_default().unwrap_or_else(|| {
            match url.scheme() {
                "https" => 443,
                _ => 80,
            }
        });

        let mut response_str = get(&url, original_headers, original_body, &domain, port);

        println!("RESPONSE RECEIVED FROM {}:\nRESPONSE REDACTED BC IT'S ALWAYS TOO LONG", domain);

        // After getting response_str:
        let dummy = response_str.clone();
        let (headers_part, body) = dummy.split_once("\r\n\r\n").unwrap_or((&dummy, ""));
        let (status_line, headers) = headers_part.split_once("\r\n").unwrap_or((headers_part, ""));

        // Parse status code properly
        let status_code = status_line.split_whitespace().nth(1).unwrap_or("000");
        let is_redirect = status_code.starts_with('3') && status_code.len() == 3;

        if is_redirect {
            let mut new_location = None;

            let mut new_headers = headers.split("\r\n")
                .map(|line| {
                    if line.starts_with("Location:") || line.starts_with("location:") {
                        let redirect_location = line.splitn(2, ":")
                            .nth(1).unwrap_or("default").trim();

                        let redirect_url = match Url::parse(redirect_location) {
                            Ok(url) => url,
                            Err(_) => url.join(redirect_location).unwrap_or_else(|_| url.clone())
                        };

                        if is_same_origin(&url, &redirect_url) {
                            new_location = Some(redirect_url);
                            line.to_string()
                        } else {
                            format!("Location: /proxy/{}", redirect_url)
                        }
                    } else {
                        line.to_string()
                    }
                }).collect::<Vec<_>>();

            if let Some(location) = new_location {
                response_str = get(&location, &new_headers.join("\r\n"), body, &domain, port)
            } else {
                let headers_str = new_headers.join("\r\n");
                response_str = format!("{}\r\n{}", status_line, filter_headers(&headers_str));
            }
        }


        println!("SENDING TO USER:\n{}", response_str);

        let mut file = File::create("decoded").unwrap();
        write!(&mut file, "{}", response_str);
        
        response_str
    }

    fn get(url: &Url, headers: &str, body: &str, domain: &String, port: u16) -> String{        
        // Extract the path 
        let path_and_query = if url.query().is_none() {
            url.path().to_string()
        } else {
            format!("{}?{}", url.path(), url.query().unwrap())
        };

        let mut filtered_headers = filter_headers(headers);
        let content_length = body.len();
        filtered_headers.push_str(&format!("Content-Length: {}\r\n", content_length));
        
        // Create the request
        let request = format!(
            "GET {path_and_query} HTTP/1.1\r\nHost: {domain}\r\n{filtered_headers}\r\n\r\n{body}",
        );
        println!("SENDING TO {}:\n{}", url.as_str(), request);
        
        let mut stream = if url.scheme() == "https" {
            // Create proper TLS config
            let config = ClientConfig::builder()
                .with_root_certificates(root_certs())
                .with_no_client_auth();
        
            // Get server name properly
            let server_name = ServerName::try_from(domain.clone())
                .map_err(|_| format!("Invalid server name: {}", domain)).unwrap();
        
            // Connect with timeouts
            let mut tcp = TcpStream::connect((&*domain.as_str(), port))
                .map_err(|e| format!("TCP connect failed: {}", e)).unwrap();
            tcp.set_read_timeout(Some(Duration::from_secs(10))).unwrap();
            tcp.set_write_timeout(Some(Duration::from_secs(10))).unwrap();
        
            // TLS handshake
            let mut conn = ClientConnection::new(Arc::new(config), server_name).unwrap();
            conn.complete_io(&mut tcp).unwrap();
            
            TlsOrTcp::Tls { conn, stream: tcp }
        } else {
            TlsOrTcp::Tcp(TcpStream::connect((&*domain.as_str(), port)).unwrap())
        };
        
        stream.write_all(request.as_bytes()).map_err(|e| format!("Write error: {}", e)).unwrap();

        println!("SENT");

        // Read response
        let mut response = Vec::new();
        let mut buffer = [0u8; 8192];
        loop {
            let bytes_read = stream.read(&mut buffer).unwrap_or(0);
            if bytes_read == 0 { break; }
                response.extend_from_slice(&buffer[..bytes_read]);
        }

        let decoded_response = decode_response(response);
        

        decoded_response
    }

    fn decode_response(response_bytes: Vec<u8>) -> String {
        let sep = b"\r\n\r\n";
        let pos = response_bytes.windows(sep.len())
            .position(|window| window == sep).unwrap_or(response_bytes.len());

        let (header_bytes, body_bytes) = response_bytes.split_at(pos);
        let body_bytes = &body_bytes[sep.len().min(body_bytes.len())..];

        let h = String::from_utf8_lossy(header_bytes).to_string();
        let headers_str = h.as_str();

        let encoding= headers_str.lines().find(|line| (line.starts_with("Content-Encoding") | line.starts_with("content-encoding")))
            .and_then(|encoding_line| {
                encoding_line.split_once(":").map(|(_, value)| value.trim())
            }).unwrap_or("identity");
        
        println!("ENCODING TYPE: {}", encoding);

        let decoded_body = match encoding {
            "gzip" => {
                let mut d = GzDecoder::new(body_bytes);
                let mut s = String::new();
                d.read_to_string(&mut s);
                s
            },
            "br" => {
                let mut d = Decompressor::new(body_bytes, body_bytes.len());
                let mut s = String::new();
                d.read_to_string(&mut s);
                s                
            },
            "deflate" => {
                let mut d = DeflateDecoder::new(body_bytes);
                let mut s = String::new();
                d.read_to_string(&mut s);
                s
            },
            "identity" | "" => String::from_utf8_lossy(body_bytes).to_string(),
            _ => return  format!("Unsupported encoding: {}", encoding).into()
        };


        format!("{}\r\n\r\n{}", filter_headers(headers_str), decoded_body)
    }

    fn is_same_origin(original: &Url, redirect: &Url) -> bool {
        original.host_str() == redirect.host_str() &&
        original.port() == redirect.port() &&
        original.scheme() == redirect.scheme()
    }

    fn filter_headers(headers: &str) -> String {
        const ESSENTIAL_HEADERS: &[&str] = &[
            "Content-Security-Policy",
            "Strict-Transport-Security",
            "X-Frame-Options"
        ];
        headers
            .lines()
            .filter(|line| {
                if ESSENTIAL_HEADERS.iter().any(|header| line.starts_with(header)) {
                    true
                } else {
                    !(line.starts_with("Host:") ||
                  line.starts_with("Connection:") ||
                  line.starts_with("Content-Length:") ||
                  line.starts_with("Cf-") ||  // Remove Cloudflare headers
                  line.starts_with("X-Forwarded-For:") ||
                  line.starts_with("Referer:") ||
                  line.starts_with("Origin:") ||
                  line.starts_with("Cdn-Loop:") ||
                  line.starts_with("Cookie:") ||
                  line.starts_with("Priority:") ||
                  line.starts_with("Sec-Fetch-") ||
                  line.starts_with("X-Forwarded-")
                )
                }
            })
            .map(|line| format!("{}\r\n", line))
            .collect()
    }

    fn parse_stream(stream: TcpStream) -> (String, String, String) {
        let mut buf_reader = BufReader::new(&stream);
    
        let mut request_line = String::new();
    
        // Read the first line (request line)
        if let Err(e) = buf_reader.read_line(&mut request_line) {
            panic!("Failed to read request line: {}", e);
        }
    
        // Read headers and determine content length
        let mut headers = String::new();
        let mut content_length = 0;
        for line in buf_reader.by_ref().lines() {
            let line = match line {
                Ok(line) => line,
                Err(e) => {
                    panic!("Error reading headers: {}", e);
                }
            };
            if line.is_empty() {
                break; // Empty line signifies the end of headers
            }
            if let Some(len) = line.strip_prefix("Content-Length: ") {
                content_length = len.trim().parse().unwrap_or(0);
            }
            headers.push_str(&line);
            headers.push('\n');
        }
    
        // Read the body based on content length
        let body = if content_length > 0 {
            let mut body = vec![0; content_length];
            if let Err(e) = buf_reader.read_exact(&mut body) {
                panic!("Error reading body: {}", e);
            }
            let body = String::from_utf8_lossy(&body);
    
            body.to_string()
        } else {
            "".to_string()
        };
    
        (request_line, headers, body)
    }
    
    fn root() -> String {
        current_dir().unwrap().to_str().unwrap().to_string()

        //format!("/Documents/code/server")
    }

    fn root_certs() -> RootCertStore {
        let mut root_store = RootCertStore::empty();
        root_store.extend(
            webpki_roots::TLS_SERVER_ROOTS
                .iter()
                .cloned()
        );
        root_store
    }
}