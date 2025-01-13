use server::ThreadPool;
use hostname;
use std::{
    env::current_dir, fs, io::{prelude::*, BufReader}, net::{TcpListener, TcpStream}, path::Path
};


fn main() {
    let host = hostname::get().unwrap().into_string().unwrap();
    println!("Hostname: {}", host);

    let p80_listener = TcpListener::bind(format!("0.0.0.0:80")).unwrap_or_else(|e| {
        panic!("Failed to bind to port 80: {e}");
    });
    let p8080_listener = TcpListener::bind(format!("0.0.0.0:8080")).unwrap_or_else(|e| {
        panic!("Failed to bind to port 8080: {e}");
    });

    let pool = ThreadPool::new(75);

    let p80_thread = {
        move || {
            for stream in p80_listener.incoming() {
                match stream {
                    Ok(stream) => {
                        println!("New port 80 connection established!");
                        handle_connection(stream);
                    }
                    Err(e) => {
                        println!("Something went hella wrong with the port 80 connection re: {e}");
                        break;
                    }
                }
            }
        }
    };

    let p8080_thread = {
        move || {
            for stream in p8080_listener.incoming() {
                match stream {
                    Ok(stream) => {
                        println!("New port 8080 connection established!");
                        handle_connection(stream);
                    }
                    Err(e) => {
                        println!("Something went hella wrong with the https connection re: {e}");
                        break;
                    }
                }
            }
        }
    };
    pool.execute(p80_thread);
    pool.execute(p8080_thread);
}

fn handle_connection(mut stream: TcpStream) {
    let (request_line, _, body) = parse_stream(stream.try_clone().unwrap());

    if request_line.len() == 0 {
        return;
    }

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
        if filename.contains(".png") || filename.contains(".ico") {
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
    } else {
        "text/html".to_string()
    };

    let mut response: Vec<u8>;
    match contents {
        Contents::String(contents) => {
            let length = contents.len();

            response = format!("{status_line}\r\nContent-Type: {content_type}\r\nContent-Length: {length}\r\nConnection: keep-alive\r\n\r\n{contents}").into_bytes();
        }
        Contents::Image(contents) => {
            let length = contents.len();

            response = format!("{status_line}\r\nContent-Type: {content_type}\r\nContent-Length: {length}\r\nConnection: keep-alive\r\n\r\n").into_bytes();
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

#[cfg(test)]
mod test {

    #[test]
    fn test(){
        
    }
}