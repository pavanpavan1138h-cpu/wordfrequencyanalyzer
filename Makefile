CC = gcc
CFLAGS = -Wall -Wextra -O2

all: naive hashing dictionary

naive: src/naive.c
	$(CC) $(CFLAGS) -o naive src/naive.c

hashing: src/hashing.c
	$(CC) $(CFLAGS) -o hashing src/hashing.c

dictionary: src/dictionary.c
	$(CC) $(CFLAGS) -o dictionary src/dictionary.c

clean:
	rm -f naive hashing dictionary
