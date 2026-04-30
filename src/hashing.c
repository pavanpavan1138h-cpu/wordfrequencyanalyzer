#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SIZE 1000

typedef struct Node {
    char word[50];
    int count;
    struct Node* next;
} Node;

Node* table[SIZE] = {NULL};

int hash(char *word) {
    int sum = 0;
    for(int i = 0; word[i] != '\0'; i++) {
        sum += word[i];
    }
    return sum % SIZE;
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

void processFile() {
    FILE *fp = fopen("input/input.txt", "r");
    char word[50];

    if (fp == NULL) {
        printf("Error opening file\n");
        return;
    }

    while (fscanf(fp, "%s", word) != EOF) {
        insert(word);
    }

    fclose(fp);
}

void display() {
    printf("Word Frequencies (Hashing):\n");

    for (int i = 0; i < SIZE; i++) {
        Node *temp = table[i];
        while (temp != NULL) {
            printf("%s -> %d\n", temp->word, temp->count);
            temp = temp->next;
        }
    }
    FILE *out = fopen("output/data.txt", "w");

for (int i = 0; i < SIZE; i++) {
    Node *temp = table[i];
    while (temp != NULL) {
        fprintf(out, "%s,%d\n", temp->word, temp->count);
        temp = temp->next;
    }
}

fclose(out);
}

int main() {
    processFile();
    display();
    return 0;
}