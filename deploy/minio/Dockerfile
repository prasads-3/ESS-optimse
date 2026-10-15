FROM minio/minio:latest

# Root credentials = the access key/secret the backend uses (single-tenant setup).
# These match AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in .env.
ENV MINIO_ROOT_USER=minio-ess
ENV MINIO_ROOT_PASSWORD=minio123-ess

EXPOSE 9010 9012

# S3 API on 9010 (matches S3_ENDPOINT=http://minio:9010), web console on 9011
CMD ["server", "/data", "--address", ":9010", "--console-address", ":9011"]
