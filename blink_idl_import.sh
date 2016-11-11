#!/bin/zsh

NODE_PATH=${NODE_PATH:-.:./static/js}
WEB_APIS_DIR=${WEB_APIS_DIR:-$(readlink -f $(dirname "$0"))}
BLINK_SRC_DIR=${BLINK_SRC_DIR:-${HOME}/src/blink/third_party/WebKit}

if [[ ! -d ${WEB_APIS_DIR} ]]; then
    >&2 echo "ERROR: WEB_APIS_DIR=${WEB_APIS_DIR} is not a directory"
fi
if [[ ! -d ${BLINK_SRC_DIR} ]]; then
    >&2 echo "ERROR: BLINK_SRC_DIR=${BLINK_SRC_DIR} is not a directory"
fi

pushd ${BLINK_SRC_DIR}
BLINK_COMMIT_HASH=$(git rev-parse HEAD)
IDL_FILES=$(git ls-files '*.idl' | grep -v bindings/ | grep -v testing/)
popd

export NODE_PATH
export WEB_APIS_DIR
export BLINK_SRC_DIR
export BLINK_COMMIT_HASH
export IDL_FILES

pushd ${WEB_APIS_DIR}
unbuffer node ./blink_idl_import.js 2>&1 | tee ./data/idl/blink/log
popd
