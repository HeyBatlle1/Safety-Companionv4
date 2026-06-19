FROM rust:1.96-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release --bins

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/scd /usr/local/bin/scd
COPY --from=builder /app/target/release/sc-mcp /usr/local/bin/sc-mcp
EXPOSE 8787
CMD ["scd"]
