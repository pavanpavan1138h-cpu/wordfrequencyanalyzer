#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define SIZE 20000

typedef struct Node {
    char word[100];
    int count;
    struct Node* next;
} Node;

Node* table[SIZE] = {NULL};

int hash(char *word) {
    unsigned long hash = 5381;
    int c;
    while ((c = *word++)) {
        hash = ((hash << 5) + hash) + c; // djb2 hash
    }
    return hash % SIZE;
}

void clean_word(char *str) {
    int i = 0, j = 0;
    while (str[i]) {
        if (isalnum((unsigned char)str[i])) {
            str[j++] = tolower((unsigned char)str[i]);
        }
        i++;
    }
    str[j] = '\0';
}

void insert(char *word) {
    int index = hash(word);
    Node *temp = table[index];

    while (temp != NULL) {
        if (strcmp(temp->word, word) == 0) {
            temp->count++;
            return;
        }
        temp = temp->next;
    }

    Node *newNode = (Node*)malloc(sizeof(Node));
    strcpy(newNode->word, word);
    newNode->count = 1;
    newNode->next = table[index];
    table[index] = newNode;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <input_file>\n", argv[0]);
        return 1;
    }

    FILE *fp = fopen(argv[1], "r");
    char temp[100];

    if (fp == NULL) {
        printf("Error opening file\n");
        return 1;
    }

    while (fscanf(fp, "%99s", temp) != EOF) {
        clean_word(temp);
        if (strlen(temp) > 0) {
            insert(temp);
        }
    }
    fclose(fp);

    // Print to stdout in CSV format for Node backend
    for (int i = 0; i < SIZE; i++) {
        Node *curr = table[i];
        while (curr != NULL) {
            printf("%s,%d\n", curr->word, curr->count);
            Node *to_free = curr;
            curr = curr->next;
            free(to_free);
        }
    }

    return 0;
}