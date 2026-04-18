#!/bin/bash
echo "Starting port forwarding for WSL -> Windows Host access..."
echo "Press Ctrl+C to stop."
echo ""

# Forwarding services to 0.0.0.0 so Windows can access them on localhost
kubectl port-forward --address 0.0.0.0 svc/frontend-service 30000:80 -n spotify-recommender &
P1=$!
kubectl port-forward --address 0.0.0.0 svc/backend-service 30001:3001 -n spotify-recommender &
P2=$!
kubectl port-forward --address 0.0.0.0 svc/ml-service 30002:5000 -n spotify-recommender &
P3=$!
kubectl port-forward --address 0.0.0.0 svc/grafana-service 30031:3000 -n spotify-recommender &
P4=$!
kubectl port-forward --address 0.0.0.0 svc/prometheus-service 30090:9090 -n spotify-recommender &
P5=$!

echo "URLs accessible from Windows Host:"
echo "- Frontend:   http://localhost:30000"
echo "- Backend:    http://localhost:30001"
echo "- ML Service: http://localhost:30002"
echo "- Grafana:    http://localhost:30031  (No login required / admin:admin)"
echo "- Prometheus: http://localhost:30090"
echo ""

wait $P1 $P2 $P3 $P4 $P5
