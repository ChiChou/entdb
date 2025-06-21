cmake_minimum_required(VERSION 3.16)
project(collector)

# 设置最低macOS版本为10.13
set(CMAKE_OSX_DEPLOYMENT_TARGET "10.13")

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

find_package(PkgConfig REQUIRED)
pkg_check_modules(SQLITE3 REQUIRED sqlite3)

file(GLOB_RECURSE SOURCES "src/*.c" "src/*.m")
file(GLOB_RECURSE HEADERS "include/*.h" "src/*.h")

add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

target_include_directories(${PROJECT_NAME} PRIVATE include)
target_include_directories(${PROJECT_NAME} PRIVATE ${SQLITE3_INCLUDE_DIRS})

target_link_libraries(${PROJECT_NAME} ${SQLITE3_LIBRARIES})

set_target_properties(${PROJECT_NAME} PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin
)

message(STATUS "Project: ${PROJECT_NAME}")
message(STATUS "SQLite3 version: ${SQLITE3_VERSION}") 