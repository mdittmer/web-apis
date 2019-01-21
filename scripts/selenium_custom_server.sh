#!/bin/bash

# Required local configuration:
# SELENIUM_JAR=/path/to/selenium.jar
# CHROME_DRIVER=/path/to/chromedriver.jar

WD=$(readlink -f $(dirname "$0")

if [ -f $WD/selenium_custom_server.local.sh ]; then
  . $WD/selenium_custom_server.local.sh
fi

# Standalone configuration
# java -jar -Dwebdriver.chrome.driver="${CHROME_DRIVER}" "${SELENIUM_JAR}" -role standalone 2>&1

# Hub-and-node configuration
NUM_SELENIUM_NODES=${NUM_SELENIUM_NODES:-2}
NUM_SELENIUM_SESSIONS_PER_NODE=${NUM_SELENIUM_SESSIONS_PER_NODE:-1}
NUM_SELENIUM_SESSIONS_TOTAL=$((${NUM_SELENIUM_NODES} * ${NUM_SELENIUM_SESSIONS_PER_NODE}))

function stop() {
    echo "**** STOPPING SELENIUM"
    echo "**** STOPPING NODES"
    for PID in ${NODE_PIDS[@]}; do
        if [ "${PID}" != "" ]; then
            echo "**** STOPPING NODE WITH PID ${PID}"
            kill ${PID}
        fi
    done
    echo "**** STOPPING HUB"
    if [ "${HUB_PID}" != "" ]; then
        echo "**** STOPPING HUB WITH PID ${HUB_PID}"
        kill "${HUB_PID}"
    fi
    echo "**** SELENIUM STOPPED"
    exit 0
}

trap stop INT

echo "**** STARTING SELENIUM"
echo "**** STARTING HUB"
java -jar -Dwebdriver.chrome.driver="${CHROME_DRIVER}" "${SELENIUM_JAR}" -role hub -maxSession ${NUM_SELENIUM_SESSIONS_TOTAL} 2>&1 &

HUB_PID=$!
NODE_PIDS=()
NODE_PORTS=()
NODE_PORT=5566
echo "**** STARTING NODES"
for I in $(seq 1 ${NUM_SELENIUM_NODES}); do
    java -jar -Dwebdriver.chrome.driver="${CHROME_DRIVER}" "${SELENIUM_JAR}" -role node -hub http://localhost:4444/grid/register -port $((${NODE_PORT} + ${I})) -maxSession ${NUM_SELENIUM_SESSIONS_PER_NODE} 2>&1 &
    NODE_PIDS+=($!)
    echo "**** Started node ${I} with PID $!"
    NODE_PORTS+=($((${NODE_PORT} + ${I})))
done

echo "**** SELENIUM STARTED"

while [ true ]; do
    sleep 1000
done
