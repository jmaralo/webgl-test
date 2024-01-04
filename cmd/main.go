package main

import (
	"flag"
	"fmt"
	"math"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var messageDelayF = flag.Duration("m", time.Millisecond*16, "message delay")
var dataDelayF = flag.Duration("d", time.Microsecond, "data delay")
var addressF = flag.String("l", "localhost:8080", "server address")

func main() {
	flag.Parse()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	source := make(chan DataPoint, 5000)
	channel := NewSPMC(source)
	start := time.Now().UnixNano()
	go func() {
		ticker := time.NewTicker(*dataDelayF)

		for range ticker.C {
			source <- DataPoint{
				Data:      (math.Sin(float64(time.Now().UnixNano()-start) / 100000000)) / 2.0,
				Timestamp: uint64(time.Now().UnixNano() - start),
			}
		}
	}()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error upgrading websocket: %v\n", err)
			return
		}

		data := make(chan DataPoint, 5000)
		id := channel.AddDestination(data)
		fmt.Println("New client: ", id)
		go handleConn(conn, data, func() {
			fmt.Println("Client disconnected: ", id)
			channel.RemoveDestination(id)
		})

	})

	fmt.Println("Server started on", *addressF)
	http.ListenAndServe(*addressF, nil)
}

type DataPoint struct {
	Data      float64 `json:"data"`
	Timestamp uint64  `json:"timestamp"`
}

func handleConn(conn *websocket.Conn, data <-chan DataPoint, onClose func()) {
	defer conn.Close()
	defer onClose()

	ticker := time.NewTicker(*messageDelayF)
	nextMessage := make([]DataPoint, 0, 5000)
	for {
		select {
		case d, ok := <-data:
			if !ok {
				return
			}
			nextMessage = append(nextMessage, d)
		case <-ticker.C:
			if len(nextMessage) == 0 {
				continue
			}

			err := conn.WriteJSON(nextMessage)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error writing to websocket: %v\n", err)
				return
			}
			nextMessage = make([]DataPoint, 0, 5000)
		}
	}
}

type SPMC[T any] struct {
	source         <-chan T
	destinationsMx *sync.Mutex
	destinations   map[uuid.UUID]chan<- T
}

func NewSPMC[T any](source <-chan T) *SPMC[T] {
	s := &SPMC[T]{
		source:         source,
		destinationsMx: &sync.Mutex{},
		destinations:   make(map[uuid.UUID]chan<- T),
	}
	go s.run()
	return s
}

func (s *SPMC[T]) run() {
	for v := range s.source {
		s.broadcast(v)
	}
}

func (s *SPMC[T]) broadcast(v T) {
	s.destinationsMx.Lock()
	defer s.destinationsMx.Unlock()
	for _, d := range s.destinations {
		select {
		case d <- v:
		default:
		}
	}
}

func (s *SPMC[T]) AddDestination(d chan<- T) uuid.UUID {
	s.destinationsMx.Lock()
	defer s.destinationsMx.Unlock()
	id := uuid.New()
	s.destinations[id] = d
	return id
}

func (s *SPMC[T]) RemoveDestination(id uuid.UUID) {
	s.destinationsMx.Lock()
	defer s.destinationsMx.Unlock()
	if dst, ok := s.destinations[id]; ok {
		close(dst)
		delete(s.destinations, id)
	}
}

func (s *SPMC[T]) Close() {
	s.destinationsMx.Lock()
	defer s.destinationsMx.Unlock()
	for _, dst := range s.destinations {
		close(dst)
	}
}
