# Bayora Deployment Makefile

.PHONY: deploy clean test keys build

build:
	@echo "Building Universal Docker Image..."
	docker build -t bayora/microservices:latest .

deploy: build keys
	@echo "Deploying Infrastructure..."
	cd bayora/infra/terraform && terraform init && terraform apply -auto-approve
	@echo "Installing Strimzi Kafka..."
	kubectl apply -f https://strimzi.io/install/latest?namespace=kafka
	kubectl apply -f bayora/infra/k8s/namespaces/kafka.yaml
	@echo "Applying K8s Manifests..."
	kubectl apply -f bayora/infra/k8s/namespaces/namespaces.yaml
	kubectl apply -f bayora/infra/k8s/namespaces/service-accounts.yaml
	kubectl apply -f bayora/infra/k8s/namespaces/secrets-rbac.yaml
	kubectl apply -f bayora/infra/k8s/namespaces/secrets.yaml
	kubectl apply -f bayora/infra/k8s/network-policies/
	kubectl apply -f bayora/infra/gvisor/runtimeclass.yaml
	kubectl apply -f bayora/infra/k8s/istio/
	@echo "Deploying Microservices (Apps)..."
	kubectl apply -f bayora/infra/k8s/namespaces/apps.yaml
	@echo "Bayora Deployment Complete."

keys:
	@echo "Generating Encryption Keys..."
	python bayora/infra/scripts/generate-keys.py

# Task 1.4: Point test target at the correct tests/integration/ directory
test:
	@echo "Running Integration Tests..."
	PYTHONPATH=. pytest tests/integration/test_session_manager.py \
	           tests/integration/test_monitoring.py \
	           tests/integration/test_pipelines.py \
	           tests/integration/test_llm_proxy.py \
	           -v

clean:
	@echo "Destroying Infrastructure..."
	cd bayora/infra/terraform && terraform destroy -auto-approve
	kubectl delete -f bayora/infra/k8s/namespaces/namespaces.yaml
