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
IDL_FILES=$(git ls-files '*.idl' | grep -v bindings/ | grep -v testing/ | head -n 30)
popd

IDL_FILES_ARR=(${(s/
/)IDL_FILES})

MASTER_FILE=$(mktemp)

for IDL_FILE in ${IDL_FILES_ARR[@]}; do
  echo ${IDL_FILE}
  TMP_FILE=$(mktemp)
  echo "${TMP_FILE}" >> ${MASTER_FILE}
  cat ${BLINK_SRC_DIR}/${IDL_FILE} | ag -o 'https?://[^/]+(/[^?#,.\n]*)?(\?[^#,.\n]*)?' >> ${TMP_FILE} &!
done

URLS=$(cat $(cat ${MASTER_FILE}) | sort | uniq)
export URLS

node blink_idl_urls_import.js
