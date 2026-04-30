#include <stdio.h>
#include <string.h>

#define MAX 1000
#define WORD_LEN 50

int main() {
    FILE *fp;
    char words[MAX][WORD_LEN];
    int count[MAX] = {0};
    int n = 0;

    fp = fopen("input/input.txt", "r");

    if (fp == NULL) {
        printf("Error opening file\n");
        return 1;
    }

    while (fscanf(fp, "%s", words[n]) != EOF) {
        n++;
    }

    fclose(fp);

    for (int i = 0; i < n; i++) {
        if (count[i] != 0) continue;

        count[i] = 1;

        for (int j = i + 1; j < n; j++) {
            if (strcmp(words[i], words[j]) == 0) {
                count[i]++;
                count[j] = -1;
            }
        }
    }

    printf("Word Frequencies (Naive):\n");

    for (int i = 0; i < n; i++) {
        if (count[i] > 0) {
            printf("%s -> %d\n", words[i], count[i]);
        }
    }

    return 0;
}