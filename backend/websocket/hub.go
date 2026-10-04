package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Permitir orígenes configurados en CORS
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Hub administra las conexiones WebSocket activas y retransmite eventos
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// Client representa a un suscriptor WebSocket individual
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// WSMessage mensaje estructurado emitido a través del socket
type WSMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

var globalHub *Hub
var once sync.Once

// GetHub obtiene la instancia singleton del Hub
func GetHub() *Hub {
	once.Do(func() {
		globalHub = &Hub{
			broadcast:  make(chan []byte, 256),
			register:   make(chan *Client),
			unregister: make(chan *Client),
			clients:    make(map[*Client]bool),
		}
		go globalHub.run()
	})
	return globalHub
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			count := len(h.clients)
			h.mu.Unlock()
			log.Printf("⚡ Nuevo cliente WebSocket conectado. Conexiones activas: %d", count)
			h.Broadcast("users:active", map[string]int{"count": count})

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			count := len(h.clients)
			h.mu.Unlock()
			log.Printf("🔌 Cliente WebSocket desconectado. Conexiones activas: %d", count)
			h.Broadcast("users:active", map[string]int{"count": count})

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// Broadcast emite un evento JSON a todos los clientes conectados de forma no bloqueante
func (h *Hub) Broadcast(event string, data interface{}) {
	msg := WSMessage{Event: event, Data: data}
	payload, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case h.broadcast <- payload:
	default:
		log.Printf("⚠️ Hub broadcast channel saturado, descartando evento '%s' para proteger la cola", event)
	}
}

// ServeWS atiende solicitudes de actualización WebSocket
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error actualizando a WebSocket: %v", err)
		return
	}

	client := &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
	}
	hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512 * 1024)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		// Si el cliente envía un evento (ej: ping o mensaje)
		var msg WSMessage
		if err := json.Unmarshal(message, &msg); err == nil {
			if msg.Event == "ping" {
				c.hub.Broadcast("pong", time.Now().UnixMilli())
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Vía eficiente de enviar mensajes encolados
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
