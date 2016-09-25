#!/bin/zsh

NODE_PATH=${NODE_PATH:-.:./static/js}
WEB_APIS_DIR=${WEB_APIS_DIR:-$(readlink -f $(dirname "$0"))}

export WEB_APIS_DIR

node  ${WEB_APIS_DIR}/webkit_idl_import.js
