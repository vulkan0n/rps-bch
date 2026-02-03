<template>
  <div class="qr-code">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script>
import { ref, watch, onMounted } from "vue";
import QRCode from "qrcode";

export default {
  name: "QrCode",
  props: {
    value: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      default: 128,
    },
  },
  setup(props) {
    const canvas = ref(null);

    const renderQR = async () => {
      if (!canvas.value || !props.value) return;

      try {
        await QRCode.toCanvas(canvas.value, props.value, {
          width: props.size,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };

    onMounted(renderQR);
    watch(() => props.value, renderQR);
    watch(() => props.size, renderQR);

    return { canvas };
  },
};
</script>

<style scoped>
.qr-code {
  display: inline-block;
  background: white;
  padding: 8px;
  border-radius: 8px;
}

.qr-code canvas {
  display: block;
}
</style>
