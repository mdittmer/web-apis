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

IDL_FILES_ARR=(${(s/
/)IDL_FILES})

TMP_FILE=$(mktemp)

for IDL_FILE in ${IDL_FILES_ARR[@]}; do
  echo ${IDL_FILE}
  cat ${BLINK_SRC_DIR}/${IDL_FILE} | ag -o 'https?://[^/]+(/[^?#,.\n]*)?(\?[^#,.\n]*)?' >> ${TMP_FILE}
done

URLS=$(cat ${TMP_FILE} | sort | uniq)
echo "" > ${TMP_FILE}

URLS_ARR=(${(s/
/)URLS})

echo "[" >> ${TMP_FILE}
for URL in ${URLS_ARR[@]}; do
  echo ${URL}
  HTML_WEB_IDL=$(curl ${URL} 2>/dev/null | sed -e ':a;N;$!ba;s/\n/ /g' | ag -o '<pre class="idl"[^>]*>(<code[^>]*>)?[^<]*(</code[^>]*>)?[^<]*</pre>' | sed -e 's/<[^>]*>//g' -e 's/\\/\\\\/g' -e 's/"/\\"/g')

  HTML_WEB_IDL_ARR=(${(s/
/)HTML_WEB_IDL})

  for HWI in ${HTML_WEB_IDL_ARR[@]}; do
    echo "  {" >> ${TMP_FILE}
    echo "    \"url\": \"${URL}\"," >> ${TMP_FILE}
    echo "    \"htmlWebIDL\":\"${HWI}\"" >> ${TMP_FILE}
    echo "  }," >> ${TMP_FILE}
  done

done
echo "]" >> ${TMP_FILE}

cp ${TMP_FILE} blink_idl_fragments.json
rm ${TMP_FILE}
