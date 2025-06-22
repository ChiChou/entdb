export default {
  theme: {
    extend: {
      keyframes: {
        progress: {
          "0%": { transform: "translateX(0) scaleX(0)" },
          "40%": { transform: "translateX(0) scaleX(0.4)" },
          "100%": { transform: "translateX(100%) scaleX(0.5)" },
        },
      },
      animation: {
        progress: "progress 1s infinite linear",
      },
    }
  }
}
