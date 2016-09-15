#!/bin/zsh

# Source this file to setup development environment

NODE_PATH=.:./static/js
NODEJS_BIN=./node_modules/.bin
PATH=$NODEJS_BIN:$PATH
PATH=`awk -F: '{for(i=1;i<=NF;i++){if(!($i in a)){a[$i];printf s$i;s=":"}}}'<<<$PATH`

export NODE_PATH
export PATH

npm install
