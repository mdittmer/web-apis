#!/bin/zsh

NODE_PATH=${NODE_PATH:-.:./static/js}
WEB_APIS_DIR=${WEB_APIS_DIR:-$(readlink -f $(dirname "$0"))}
BLINK_SRC_DIR=${BLINK_SRC_DIR:-${HOME}/src/chromium/src/third_party/WebKit}

if [[ ! -d ${WEB_APIS_DIR} ]]; then
    >&2 echo "ERROR: WEB_APIS_DIR=${WEB_APIS_DIR} is not a directory"
fi
if [[ ! -d ${BLINK_SRC_DIR} ]]; then
    >&2 echo "ERROR: BLINK_SRC_DIR=${BLINK_SRC_DIR} is not a directory"
fi

pushd ${BLINK_SRC_DIR}
IDL_FILES=$(git ls-files '*.idl' | grep -v bindings/ | grep -v testing/)
popd

IDL_FILES_ARR=(${(s/
/)IDL_FILES})

MASTER_FILE=$(mktemp)

for IDL_FILE in ${IDL_FILES_ARR[@]}; do
  TMP_FILE=$(mktemp)
  echo "${TMP_FILE}" >> ${MASTER_FILE}
  cat ${BLINK_SRC_DIR}/${IDL_FILE} | \
    ag -o 'https?://[^/]+(/[^?#, \n]*)?(\?[^#, \n]*)?' | \
    ag '(dev\.w3\.org|\.github\.io|spec\.whatwg\.org|css-houdini\.org|khronos\.org|dvcs.w3.org\/hg\/speech-api\/raw-file\/tip\/webspeechapi\.html)' | \
    ag -v 'web\.archive\.org' >> ${TMP_FILE} &
done

wait

URLS=$(cat $(cat ${MASTER_FILE}) | sort | uniq)

export WEB_APIS_DIR
export URLS

unbuffer node --max_old_space_size=16384 "${WEB_APIS_DIR}/blink_idl_urls_import.js" 2>&1 | tee "${WEB_APIS_DIR}/data/idl/blink/linked/log"
