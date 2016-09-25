#!/bin/zsh

NODE_PATH=${NODE_PATH:-.:./static/js}
WEB_APIS_DIR=${WEB_APIS_DIR:-$(readlink -f $(dirname "$0"))}

export WEB_APIS_DIR

node --max_old_space_size=16384 caniuse_idl_urls_import.js
