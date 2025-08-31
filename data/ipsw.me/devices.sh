#!/bin/sh

curl -v https://api.ipsw.me/v4/devices | jq -r ".[].identifier" | grep iPhone
