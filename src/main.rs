use server::threads::ThreadPool;
use server::http::handle_connection;
use std::net::TcpListener;
use hostname;


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
                        println!("Something went really wrong with the port 80 connection re: {e}");
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
                        println!("Something went really wrong with the https connection re: {e}");
                        break;
                    }
                }
            }
        }
    };
    pool.execute(p80_thread);
    pool.execute(p8080_thread);
}


#[cfg(test)]
mod test {

    #[test]
    fn test(){
        
    }
}