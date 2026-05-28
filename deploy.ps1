Write-Host "Building Universal Docker Image..."
docker build -t bayora/microservices:latest .

Write-Host "Generating Encryption Keys..."
python bayora/infra/scripts/generate-keys.py

Write-Host "Deploying Infrastructure..."
Push-Location bayora/infra/terraform
terraform init
terraform apply -auto-approve
Pop-Location

Write-Host "Installing Strimzi Kafka..."
kubectl apply -f https://strimzi.io/install/latest?namespace=kafka
kubectl apply -f bayora/infra/k8s/namespaces/kafka.yaml

Write-Host "Applying K8s Manifests..."
kubectl apply -f bayora/infra/k8s/namespaces/namespaces.yaml
kubectl apply -f bayora/infra/k8s/namespaces/service-accounts.yaml
kubectl apply -f bayora/infra/k8s/namespaces/secrets-rbac.yaml
kubectl apply -f bayora/infra/k8s/namespaces/secrets.yaml
kubectl apply -f bayora/infra/k8s/network-policies/
kubectl apply -f bayora/infra/gvisor/runtimeclass.yaml
kubectl apply -f bayora/infra/k8s/istio/

Write-Host "Deploying Microservices (Apps)..."
kubectl apply -f bayora/infra/k8s/namespaces/apps.yaml

Write-Host "Bayora Deployment Complete."
