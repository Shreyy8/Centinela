#!/bin/bash
set -e

echo "Running Isolation Test Suite..."

# Test 1: DNS resolution of blue-team service from red-team pod should fail
echo "Test 1: Red-team to Blue-team DNS resolution"
if kubectl exec -n red-team deploy/red-team-service -- nslookup blue-team-service.blue-team.svc.cluster.local > /dev/null 2>&1; then
    echo "[FAIL] Test 1: Red-team was able to resolve Blue-team DNS"
    exit 1
else
    echo "[PASS] Test 1: DNS resolution blocked as expected"
fi

# Test 2: Direct TCP from red-team to llm-sandbox should fail
echo "Test 2: Direct TCP Red-team to LLM-sandbox"
if kubectl exec -n red-team deploy/red-team-service -- nc -vz llm-proxy-service.llm-sandbox.svc.cluster.local 8000 > /dev/null 2>&1; then
    echo "[FAIL] Test 2: Red-team successfully connected to LLM-sandbox"
    exit 1
else
    echo "[PASS] Test 2: Direct TCP connection blocked as expected"
fi

# Test 3: Attempt ptrace from within a container should fail
echo "Test 3: Attempt ptrace in red-team pod"
# We can test this by running a simple python or C snippet, or using strace if installed.
# We'll use a small python script to invoke ptrace
PTRACE_TEST="python3 -c \"import ctypes; libc = ctypes.CDLL('libc.so.6'); exit(libc.ptrace(0, 0, 0, 0) == -1)\""
if kubectl exec -n red-team deploy/red-team-service -- bash -c "$PTRACE_TEST" > /dev/null 2>&1; then
    echo "[FAIL] Test 3: ptrace was successful or not blocked by seccomp"
    exit 1
else
    echo "[PASS] Test 3: ptrace blocked by seccomp/gVisor as expected"
fi

echo "All Isolation Tests Passed!"
