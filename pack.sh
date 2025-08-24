#!/bin/zsh
ls output > output/list
pushd output
tar -cvzf ../output.tar.gz *
popd
