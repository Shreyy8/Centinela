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

test:
	@echo "Running All Tests..."
	PYTHONPATH=. pytest bayora/services/session_manager/test_session_manager.py \
	           bayora/services/llm_proxy/test_llm_proxy.py \
	           bayora/ml/evaluation/test_pipelines.py \
	           bayora/monitoring/test_monitoring.py

clean:
	@echo "Destroying Infrastructure..."
	cd bayora/infra/terraform && terraform destroy -auto-approve
	kubectl delete -f bayora/infra/k8s/namespaces/namespaces.yaml
