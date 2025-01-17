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
        env::current_dir, fs, io::{prelude::*, BufReader}, net::TcpStream, path::Path
    };

    pub fn handle_connection(mut stream: TcpStream) {
        let (request_line, _, body) = parse_stream(stream.try_clone().unwrap());
    
        if request_line.len() == 0 {
            return;
        }
        println!("{}", request_line);
    
        if &request_line[0..3] == "GET" {
            let response = create_response(&request_line);
    
            if let Err(e) = stream.write_all(&response[..]) {
                println!("Error writing response: {}", e);
            }
        } else if &request_line[0..4] == "POST" {
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
        println!("{filename}: {}\n", Path::new(&filename).exists());
    
        enum Contents<String, Vec> {
            String(String),
            Image(Vec),
        }
    
        let (status_line, contents) = if Path::new(&filename).exists() {
            if filename.contains(".png") || filename.contains(".ico") || filename.contains(".gif"){
                (
                    "HTTP/1.1 200 OK".to_string(),
                    Contents::Image(fs::read(filename).unwrap()),
                )
            } else {
                (
                    "HTTP/1.1 200 OK".to_string(),
                    Contents::String(fs::read_to_string(filename).unwrap()),
                )
            }
        } else {
            (
                "HTTP/1.1 404 Not Found".to_string(),
                Contents::String(fs::read_to_string(format!("{}/404.html", root())).unwrap()),
            )
        };
    
        let filename = if page == "/" {
            "home.html".to_string()
        } else if !page.contains(".") {
            page[1..].to_string() + ".html"
        } else {
            page[1..].to_string()
        };
    
        let content_type = if !status_line.contains("OK") || filename.contains(".html") {
            "text/html".to_string()
        } else if filename.contains(".css") {
            "text/css".to_string()
        } else if filename.contains(".js") {
            "application/javascript".to_string()
        } else if filename.contains(".png") || filename.contains(".ico") || filename.contains(".gif"){
            "image".to_string()
        } else {
            "text/html".to_string()
        };
        
        let cache_headers = "Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\nPragma: no-cache\r\nExpires: 0".to_string();

        let mut response: Vec<u8>;
        match contents {
            Contents::String(contents) => {
                let length = contents.len();
    
                response = format!("{status_line}\r\nContent-Type: {content_type}\r\nContent-Length: {length}\r\nConnection: keep-alive\r\n{cache_headers}\r\n\r\n{contents}").into_bytes();
            }
            Contents::Image(contents) => {
                let length = contents.len();
    
                response = format!("{status_line}\r\nContent-Type: {content_type}\r\nContent-Length: {length}\r\nConnection: keep-alive\r\n{cache_headers}\r\n\r\n").into_bytes();
                response.extend(contents);
            }
        }
    
        response
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
    }
}