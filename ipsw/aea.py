#!/usr/bin/env python3

# MIT License
#
# Copyright (c) 2024 Dhinak G
# https://github.com/dhinakg/aeota

# Modified from Nicolas's initial script
# Thx to Siguza and Snoolie for AEA auth block parsing information

# Requirements: pip3 install pyhpke

import argparse
import base64
import json
import sys
import urllib.request
from pathlib import Path
from pprint import pprint

from pyhpke import AEADId, CipherSuite, KDFId, KEMId, KEMKey

AEA_PROFILE__HKDF_SHA256_AESCTR_HMAC__SYMMETRIC__NONE = 1

suite = CipherSuite.new(
    KEMId.DHKEM_P256_HKDF_SHA256, KDFId.HKDF_SHA256, AEADId.AES256_GCM
)


def get_key(f, verbose: bool = False):
    fields = {}
    header = f.read(12)
    assert len(header) == 12

    magic = header[:4]
    assert magic == b"AEA1"

    profile = int.from_bytes(header[4:7], "little")
    assert profile == AEA_PROFILE__HKDF_SHA256_AESCTR_HMAC__SYMMETRIC__NONE

    auth_data_blob_size = int.from_bytes(header[8:12], "little")
    assert auth_data_blob_size > 0

    auth_data_blob = f.read(auth_data_blob_size)
    assert len(auth_data_blob) == auth_data_blob_size

    assert auth_data_blob[:4]

    while len(auth_data_blob) > 0:
        field_size = int.from_bytes(auth_data_blob[:4], "little")
        field_blob = auth_data_blob[:field_size]

        key, value = field_blob[4:].split(b"\x00", 1)

        fields[key.decode()] = value.decode()

        auth_data_blob = auth_data_blob[field_size:]

    if verbose:
        pprint(fields, stream=sys.stderr)

    assert "com.apple.wkms.fcs-response" in fields
    assert "com.apple.wkms.fcs-key-url" in fields

    fcs_response = json.loads(fields["com.apple.wkms.fcs-response"])
    enc_request = base64.b64decode(fcs_response["enc-request"])
    wrapped_key = base64.b64decode(fcs_response["wrapped-key"])
    url = fields["com.apple.wkms.fcs-key-url"]

    with urllib.request.urlopen(url) as r:
        pem = r.read()

    privkey = KEMKey.from_pem(pem)

    recipient = suite.create_recipient_context(enc_request, privkey)
    pt = recipient.open(wrapped_key)

    if verbose:
        print(f"Key: {base64.b64encode(pt).decode()}")
    else:
        print(base64.b64encode(pt).decode())


def main(path: str, verbose: bool = False):
    aea_path = Path(path)
    assert aea_path.exists()
    with aea_path.open("rb") as f:
        get_key(f, verbose)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Get the key for an AEA file or URL")
    parser.add_argument("path", help="Path or URL to the AEA file")
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Show verbose output"
    )
    args = parser.parse_args()

    main(args.path, args.verbose)
