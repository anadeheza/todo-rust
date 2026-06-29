FROM rust:1.85 AS builder 
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/rust_web_app .
EXPOSE 3001
CMD ["./rust_web_app"] 