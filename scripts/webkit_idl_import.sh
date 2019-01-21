#!/bin/bash

WD=$(readlink -f $(dirname "$0"))

WEB_APIS_DIR=${WEB_APIS_DIR:-$WD/..}
NODE_PATH=${NODE_PATH:-${WEB_APIS_DIR}}

export WEB_APIS_DIR

node  ${WEB_APIS_DIR}/webkit_idl_import.js
