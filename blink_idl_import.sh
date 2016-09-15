#!/bin/zsh

NODE_PATH=${NODE_PATH:-.:./static/js}
WEB_APIS_DIR=${WEB_APIS_DIR:-$(readlink -f $(dirname "$0"))}
CHROMIUM_SRC_DIR=${CHROMIUM_SRC_DIR:-${HOME}/src/chromium/src}
BLINK_SRC_DIR=${BLINK_SRC_DIR:-${CHROMIUM_SRC_DIR}/third_party/WebKit}

if [[ ! -d ${WEB_APIS_DIR} ]]; then
    >&2 echo "ERROR: WEB_APIS_DIR=${WEB_APIS_DIR} is not a directory"
fi
if [[ ! -d ${BLINK_SRC_DIR} ]]; then
    >&2 echo "ERROR: BLINK_SRC_DIR=${BLINK_SRC_DIR} is not a directory"
fi

pushd ${BLINK_SRC_DIR}
IDL_FILES=$(git ls-files '*.idl' | grep -v bindings/ | grep -v testing/)
popd

export NODE_PATH
export WEB_APIS_DIR
export BLINK_SRC_DIR
export IDL_FILES
node $WEB_APIS_DIR/blink_idl_import.js
