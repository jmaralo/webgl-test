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

const BUFFER_SIZE = 5000

var messageDelayF = flag.Duration("m", time.Millisecond*16, "message delay")
var dataDelayF = flag.Duration("d", time.Microsecond, "data delay")
var addressF = flag.String("l", "localhost:8080", "server address")

func main() {
	flag.Parse()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	channel1 := newChannel(func(t int64) float64 {
		return (math.Sin(float64(t) / 500000000)) / 2.0
	})

	channel2 := newChannel(func(t int64) float64 {
		return (math.Cos(float64(t) / 500000000)) / 2.0
	})

	channel3 := newChannel(func(t int64) float64 {
		d := (math.Tan(float64(t) / 500000000)) / 2.0
		if d > 2 {
			return 2
		} else if d < -2 {
			return -2
		} else {
			return d
		}
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error upgrading websocket: %v\n", err)
			return
		}

		data1 := make(chan DataPoint, BUFFER_SIZE)
		id1 := channel1.AddDestination(data1)

		data2 := make(chan DataPoint, BUFFER_SIZE)
		id2 := channel2.AddDestination(data2)

		data3 := make(chan DataPoint, BUFFER_SIZE)
		id3 := channel3.AddDestination(data3)

		fmt.Println("New client")

		go handleConn(conn, data1, data2, data3, func() {
			fmt.Println("Client disconnected")
			channel1.RemoveDestination(id1)
			channel2.RemoveDestination(id2)
			channel3.RemoveDestination(id3)
		})
	})

	fmt.Println("Server started on", *addressF)
	http.ListenAndServe(*addressF, nil)
}

type DataPoint struct {
	Data      float64 `json:"data"`
	Timestamp uint64  `json:"timestamp"`
}

func handleConn(conn *websocket.Conn, data1, data2, data3 <-chan DataPoint, onClose func()) {
	defer conn.Close()
	defer onClose()

	ticker := time.NewTicker(*messageDelayF)
	nextMessage1 := make([]DataPoint, 0, BUFFER_SIZE)
	nextMessage2 := make([]DataPoint, 0, BUFFER_SIZE)
	nextMessage3 := make([]DataPoint, 0, BUFFER_SIZE)
	for {
		select {
		case a, ok := <-data1:
			if !ok {
				return
			}
			nextMessage1 = append(nextMessage1, a)
		case b, ok := <-data2:
			if !ok {
				return
			}
			nextMessage2 = append(nextMessage2, b)
		case c, ok := <-data3:
			if !ok {
				return
			}
			nextMessage3 = append(nextMessage3, c)
		case <-ticker.C:
			if len(nextMessage1) == 0 && len(nextMessage2) == 0 {
				continue
			}

			err := conn.WriteJSON(message{
				A: nextMessage1,
				B: nextMessage2,
				C: nextMessage3,
			})
			if err != nil {
				fmt.Fprintf(os.Stderr, "error writing to websocket: %v\n", err)
				return
			}
			nextMessage1 = make([]DataPoint, 0, BUFFER_SIZE)
			nextMessage2 = make([]DataPoint, 0, BUFFER_SIZE)
			nextMessage3 = make([]DataPoint, 0, BUFFER_SIZE)
		}
	}
}

type message struct {
	A []DataPoint `json:"a"`
	B []DataPoint `json:"b"`
	C []DataPoint `json:"c"`
}

func newChannel(data func(t int64) float64) *SPMC[DataPoint] {
	source := make(chan DataPoint, BUFFER_SIZE)
	channel := NewSPMC(source)
	go func() {
		ticker := time.NewTicker(*dataDelayF)

		for range ticker.C {
			t := time.Now().UnixNano()
			source <- DataPoint{
				Data:      data(t),
				Timestamp: uint64(t),
			}
		}
	}()
	return channel
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
