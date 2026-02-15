# Deployment Guide

This guide covers deploying the airenarpit-png/app to various cloud platforms.

## Deployment Options

- [Heroku](#heroku)
- [AWS EC2](#aws-ec2)
- [DigitalOcean](#digitalocean)
- [Docker Hub](#docker-hub)

## Heroku

### Prerequisites
- Heroku account
- Heroku CLI installed

### Steps

1. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

2. **Add buildpacks**
   ```bash
   heroku buildpacks:add heroku/nodejs --index 1
   heroku buildpacks:add heroku/python --index 2
   ```

3. **Set environment variables**
   ```bash
   heroku config:set FLASK_ENV=production
   heroku config:set VITE_API_URL=https://your-app-name.herokuapp.com
   ```

4. **Create Procfile**
   ```
   web: gunicorn backend.app:app
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

## AWS EC2

### Prerequisites
- AWS account
- EC2 instance running Ubuntu 22.04
- Security group with ports 80, 443, 5000 open

### Steps

1. **SSH into instance**
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

2. **Install dependencies**
   ```bash
   sudo apt-get update
   sudo apt-get install -y nodejs npm python3 python3-pip docker.io
   sudo usermod -aG docker $USER
   ```

3. **Clone repository**
   ```bash
   git clone https://github.com/airenarpit-png/app.git
   cd app
   ```

4. **Build Docker image**
   ```bash
   docker build -t airenarpit-png/app:latest .
   ```

5. **Run container**
   ```bash
   docker run -d \
     -p 5000:5000 \
     -e FLASK_ENV=production \
     --restart unless-stopped \
     airenarpit-png/app:latest
   ```

6. **Setup reverse proxy (Nginx)**
   ```bash
   sudo apt-get install -y nginx
   # Configure nginx to proxy to localhost:5000
   ```

## DigitalOcean

### Using App Platform

1. **Connect GitHub repository**
   - Log in to DigitalOcean
   - Create new app from GitHub

2. **Configure build settings**
   - Set build command: `npm run build`
   - Set start command: `gunicorn backend.app:app`

3. **Set environment variables**
   - `FLASK_ENV=production`
   - `VITE_API_URL=https://your-app.ondigitalocean.app`

4. **Deploy**
   - Click "Create App"

### Using Droplet

Similar to AWS EC2, use Docker for containerized deployment.

## Docker Hub

1. **Build image**
   ```bash
   docker build -t username/app:1.0.0 .
   docker build -t username/app:latest .
   ```

2. **Login to Docker Hub**
   ```bash
   docker login
   ```

3. **Push images**
   ```bash
   docker push username/app:1.0.0
   docker push username/app:latest
   ```

4. **Pull and run**
   ```bash
   docker run -p 5000:5000 username/app:latest
   ```

## GitHub Container Registry

1. **Build image**
   ```bash
   docker build -t ghcr.io/airenarpit-png/app:latest .
   ```

2. **Login to GHCR**
   ```bash
   echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
   ```

3. **Push image**
   ```bash
   docker push ghcr.io/airenarpit-png/app:latest
   ```

## Kubernetes Deployment

### Create deployment manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: airenarpit-png-app
  template:
    metadata:
      labels:
        app: airenarpit-png-app
    spec:
      containers:
      - name: app
        image: ghcr.io/airenarpit-png/app:latest
        ports:
        - containerPort: 5000
        env:
        - name: FLASK_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 10
```

### Deploy to Kubernetes

```bash
kubectl apply -f deployment.yaml
kubectl expose deployment app-deployment --type=LoadBalancer --port=80 --target-port=5000
```

## Monitoring

### Logging
- Use CloudWatch (AWS), Stackdriver (GCP), or ELK Stack
- Configure application logging to stdout/stderr

### Metrics
- Monitor CPU, memory, disk usage
- Track application response times
- Monitor error rates

### Health Checks
- Configure health check endpoints: `/health`
- Set appropriate timeouts and retry policies

## Post-Deployment

1. **Verify deployment**
   ```bash
   curl https://your-domain.com/health
   ```

2. **Run smoke tests**
   ```bash
   npm run test:backend
   ```

3. **Monitor logs**
   ```bash
   # Check for errors
   docker logs container-id
   ```

4. **Update DNS**
   - Point domain to deployed application

5. **Enable HTTPS**
   - Use Let's Encrypt for SSL certificates
   - Configure auto-renewal

## Rollback Procedure

1. **Identify issue**
   ```bash
   # Check logs and metrics
   ```

2. **Deploy previous version**
   ```bash
   docker pull ghcr.io/airenarpit-png/app:previous-tag
   docker run -d --name app ghcr.io/airenarpit-png/app:previous-tag
   ```

3. **Verify deployment**
   ```bash
   curl https://your-domain.com/health
   ```

## Maintenance

- Regular security updates
- Dependency version bumps
- Database backups
- Log rotation
- Performance optimization