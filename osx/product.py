def name(version: str) -> str:
    # for macOS 11+
    MACOS_NAMES = {
        15: "Sequoia",
        14: "Sonoma",
        13: "Ventura",
        12: "Monterey",
        11: "Big Sur",
    }

    # for OS X 10.x
    OSX_NAMES = {
        15: "Catalina",
        14: "Mojave",
        13: "High Sierra",
        12: "Sierra",
        11: "El Capitan",
        10: "Yosemite",
        9: "Mavericks",
        8: "Mountain Lion",
        7: "Lion",
        6: "Snow Leopard",
        5: "Leopard",
        4: "Tiger",
        3: "Panther",
        2: "Jaguar",
        1: "Puma",
        0: "Cheetah",
    }

    assert version and len(version), "Invalid version tuple"

    major, *minor = map(int, version.split("."))
    minor = minor[0] if minor else 0

    if major >= 11:
        try:
            return f"macOS {MACOS_NAMES[major]}"
        except KeyError:
            raise ValueError(f"Unknown macOS version: {major}.{minor}")

    # Handle OS X (10.x versions)
    if major == 10:
        name = OSX_NAMES.get(minor)
        if not name:
            raise ValueError(f"Unknown macOS version: {major}.{minor}")

        if minor >= 12:  # 10.12 Sierra and later
            return f"macOS {name}"
        elif minor >= 8:  # 10.8 Mountain Lion to 10.11 El Capitan
            return f"OS X {name}"
        else:  # 10.0 Cheetah to 10.7 Lion
            return f"Mac OS X {name}"

    raise ValueError(f"Unknown macOS version: {major}.{minor}")
