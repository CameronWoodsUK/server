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

    let pool = ThreadPool::new(75);
    
    for stream in p80_listener.incoming() {
        match stream {
            Ok(stream) => {
                println!("New port 80 connection established!");

                pool.execute(|| handle_connection(stream));
            }
            Err(e) => {
                println!("Something went really wrong with the port 80 connection re: {e}");
                break;
            }
        }
    }
}


#[cfg(test)]
mod test {

    #[test]
    fn test(){
        
    }
}