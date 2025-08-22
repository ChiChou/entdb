#!/bin/sh

curl -v "https://api.ipsw.me/v4/device/iPhone12,3?type=ipsw" | jq -r ".firmwares.[].url" | parallel -j 4 curl -L -O {}
