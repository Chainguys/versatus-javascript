#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$DIR/colored_echo.sh"

# Use the current working directory as the root directory
ROOT_DIR=$(pwd)
BUILD_WASM_PATH="$ROOT_DIR/build/build.wasm"
WASM_PATH="$ROOT_DIR/build/versa.wasm"

# Check if the JSON input file path is provided as an argument
if [ -z "$1" ]; then
    print_error "Error: No JSON input file path provided."
    exit 1
fi
INPUT_JSON_PATH="$1"

# Check if the provided JSON input file exists
if [ ! -f "$INPUT_JSON_PATH" ]; then
    print_error "JSON input file '$INPUT_JSON_PATH' does not exist."
    exit 1
fi

print_info "Running the test against versa-wasm..."

EXECUTE_RESPONSE=$("$WASM_PATH" execute --wasm "$BUILD_WASM_PATH" --json "$INPUT_JSON_PATH" --meter-limit 100000000)
EXECUTE_STATUS=$?

if [ $EXECUTE_STATUS -eq 0 ]; then
    print_info "\nTest results:"
    print_light_gray "=/=/=/=/=/=/=/=/=/=/=/=/=/=/=/="
    print_magenta "$EXECUTE_RESPONSE"
    print_light_gray "=/=/=/=/=/=/=/=/=/=/=/=/=/=/=/="
    print_light_green "Contract method was successful."
else
    print_error "Command execution failed with exit code $EXECUTE_STATUS."
fi

print_light_gray "Test complete."
