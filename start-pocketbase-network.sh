#!/bin/bash

# Get the machine's IP address
IP=$(hostname -I | awk '{print $1}')

echo "🚀 Starting PocketBase with network access..."
echo "📍 Machine IP: $IP"
echo "🌐 PocketBase will be accessible at:"
echo "   - Local: http://localhost:8090"
echo "   - Network: http://$IP:8090"
echo "   - Admin UI: http://$IP:8090/_/"
echo ""

# Start PocketBase bound to all interfaces
cd pocketbase && ./pocketbase serve --http="0.0.0.0:8090" 