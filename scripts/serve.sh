#!/bin/zsh

export SH_DIR=$(readlink -f $(dirname "$0"))

GRAY='\033[0;47m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

function verbose() {
    printf "\n${GREEN}[  $(date)  INFO  ]  $1${NC}\n"
}

function info() {
    printf "\n${GREEN}[  $(date)  INFO  ]  $1${NC}\n"
}

function warn() {
    printf "\n${YELLOW}[  $(date)  WARN  ]  $1${NC}\n"
}

function error() {
    printf "\n${RED}[  $(date)  ERRR  ]  $1${NC}\n"
}

WP_PID=""
WS_PID=""

function stop() {
    warn "STOPPING WEBPACK (PID=${WP_PID})"
    if [ "${WP_PID}" != "" ]; then kill ${WP_PID}; fi
    info "WEBPACK STOPPED"
    warn "STOPPING WEB SERVER (PID=${WS_PID})"
    if [ "${WS_PID}" != "" ]; then kill ${WP_PID}; fi
    info "WEB SERVER STOPPED"
    exit 0
}

trap stop INT

warn "STARTING WEBPACK"
webpack --watch --progress --config $SH_DIR/../config/webpack.dev.config.es6.js &
WP_PID=$!
info "WEBPACK STARTED (PID=${WP_PID})"

warn "STARTING WEB SERVER"
node $SH_DIR/../main/serve.js &
WS_PID=$!
info "WEB SERVER STARTED (PID=${WS_PID})"

while [ true ]; do
    sleep 1000
done
