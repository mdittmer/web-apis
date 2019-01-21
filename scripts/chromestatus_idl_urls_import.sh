#!/bin/bash

WD=$(readlink -f $(dirname "$0"))

WEB_APIS_DIR=${WEB_APIS_DIR:-$WD/..}
NODE_PATH=${NODE_PATH:-$WEB_APIS_DIR}

export WEB_APIS_DIR

node --max_old_space_size=16384 chromestatus_idl_urls_import.js
