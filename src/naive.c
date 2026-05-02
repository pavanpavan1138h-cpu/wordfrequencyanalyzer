#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define MAX_WORDS 20000
#define MAX_LEN 100

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

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <input_file>\n", argv[0]);
        return 1;
    }

    FILE *fp = fopen(argv[1], "r");
    if (!fp) {
        printf("Error opening file\n");
        return 1;
    }

    // Allocate memory to avoid stack overflow
    char (*words)[MAX_LEN] = malloc(MAX_WORDS * sizeof(*words));
    int *count = calloc(MAX_WORDS, sizeof(int));
    
    if (!words || !count) {
        printf("Memory allocation failed\n");
        return 1;
    }

    int n = 0;
    char temp[MAX_LEN];

    while (fscanf(fp, "%99s", temp) != EOF && n < MAX_WORDS) {
        clean_word(temp);
        if (strlen(temp) > 0) {
            strcpy(words[n], temp);
            n++;
        }
    }
    fclose(fp);

    for (int i = 0; i < n; i++) {
        if (count[i] == -1) continue;
        count[i] = 1;
        for (int j = i + 1; j < n; j++) {
            if (count[j] != -1 && strcmp(words[i], words[j]) == 0) {
                count[i]++;
                count[j] = -1; // Mark as counted
            }
        }
    }

    // Print to stdout in CSV format for Node backend
    for (int i = 0; i < n; i++) {
        if (count[i] > 0) {
            printf("%s,%d\n", words[i], count[i]);
        }
    }

    free(words);
    free(count);
    return 0;
}