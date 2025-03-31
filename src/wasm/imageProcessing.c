#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <math.h>
#include <string.h>
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
uint8_t* create_buffer(int width, int height) {
  return malloc(width * height * 4 * sizeof(uint8_t));
}

EMSCRIPTEN_KEEPALIVE
void destroy_buffer(uint8_t* p) {
  free(p);
}

EMSCRIPTEN_KEEPALIVE
void apply_monochrome(uint8_t* buffer, int width, int height) {
    int size = width * height * 4;
    for(int i = 0; i < size; i += 4) {
        double r = buffer[i] * 0.299;
        double g = buffer[i + 1] * 0.587;
        double b = buffer[i + 2] * 0.114;
        uint8_t gray = (uint8_t)(r + g + b);
        buffer[i] = gray;
        buffer[i + 1] = gray;
        buffer[i + 2] = gray;
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_bnw(uint8_t* buffer, int width, int height) {
    int size = width * height * 4;
    for(int i = 0; i < size; i += 4) {
        double r = buffer[i] * 0.299;
        double g = buffer[i + 1] * 0.587;
        double b = buffer[i + 2] * 0.114;
        uint8_t val = (r + g + b) > 127 ? 255 : 0;
        buffer[i] = val;
        buffer[i + 1] = val;
        buffer[i + 2] = val;
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_vivid(uint8_t* buffer, int width, int height) {
    int size = width * height * 4;
    double saturation = 1.5;
    for(int i = 0; i < size; i += 4) {
        double r = buffer[i] * saturation;
        double g = buffer[i + 1] * saturation;
        double b = buffer[i + 2] * saturation;
        
        buffer[i] = r > 255 ? 255 : (uint8_t)r;
        buffer[i + 1] = g > 255 ? 255 : (uint8_t)g;
        buffer[i + 2] = b > 255 ? 255 : (uint8_t)b;
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_bright(uint8_t* buffer, int width, int height) {
    int size = width * height * 4;
    int brightness = 50;
    for(int i = 0; i < size; i += 4) {
        int r = buffer[i] + brightness;
        int g = buffer[i + 1] + brightness;
        int b = buffer[i + 2] + brightness;
        
        buffer[i] = r > 255 ? 255 : (uint8_t)r;
        buffer[i + 1] = g > 255 ? 255 : (uint8_t)g;
        buffer[i + 2] = b > 255 ? 255 : (uint8_t)b;
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_brightness_adjustment(uint8_t* buffer, int width, int height, int value) {
    int size = width * height * 4;
    for(int i = 0; i < size; i += 4) {
        int r = buffer[i] + value;
        int g = buffer[i + 1] + value;
        int b = buffer[i + 2] + value;
        
        buffer[i] = r > 255 ? 255 : (r < 0 ? 0 : r);
        buffer[i + 1] = g > 255 ? 255 : (g < 0 ? 0 : g);
        buffer[i + 2] = b > 255 ? 255 : (b < 0 ? 0 : b);
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_contrast_adjustment(uint8_t* buffer, int width, int height, int value) {
    float factor = (259.0f * (value + 255.0f)) / (255.0f * (259.0f - value));
    int size = width * height * 4;
    for(int i = 0; i < size; i += 4) {
        float r = factor * (buffer[i] - 128) + 128;
        float g = factor * (buffer[i + 1] - 128) + 128;
        float b = factor * (buffer[i + 2] - 128) + 128;
        
        buffer[i] = r > 255 ? 255 : (r < 0 ? 0 : (uint8_t)r);
        buffer[i + 1] = g > 255 ? 255 : (g < 0 ? 0 : (uint8_t)g);
        buffer[i + 2] = b > 255 ? 255 : (b < 0 ? 0 : (uint8_t)b);
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_saturation_adjustment(uint8_t* buffer, int width, int height, int value) {
    float factor = 1.0f + (value / 100.0f);
    int size = width * height * 4;
    for(int i = 0; i < size; i += 4) {
        float gray = buffer[i] * 0.299f + buffer[i + 1] * 0.587f + buffer[i + 2] * 0.114f;
        float r = gray + (buffer[i] - gray) * factor;
        float g = gray + (buffer[i + 1] - gray) * factor;
        float b = gray + (buffer[i + 2] - gray) * factor;
        
        buffer[i] = r > 255 ? 255 : (r < 0 ? 0 : (uint8_t)r);
        buffer[i + 1] = g > 255 ? 255 : (g < 0 ? 0 : (uint8_t)g);
        buffer[i + 2] = b > 255 ? 255 : (b < 0 ? 0 : (uint8_t)b);
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_highlights_adjustment(uint8_t* buffer, int width, int height, int value) {
    float factor = value / 100.0f;
    int size = width * height * 4;
    for(int i = 0; i < size; i += 4) {
        if(buffer[i] > 192 || buffer[i + 1] > 192 || buffer[i + 2] > 192) {
            float r = buffer[i] + (255 - buffer[i]) * factor;
            float g = buffer[i + 1] + (255 - buffer[i + 1]) * factor;
            float b = buffer[i + 2] + (255 - buffer[i + 2]) * factor;
            
            buffer[i] = r > 255 ? 255 : (uint8_t)r;
            buffer[i + 1] = g > 255 ? 255 : (uint8_t)g;
            buffer[i + 2] = b > 255 ? 255 : (uint8_t)b;
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_shadows_adjustment(uint8_t* buffer, int width, int height, int value) {
    float factor = value / 100.0f;
    int size = width * height * 4;
    for(int i = 0; i < size; i += 4) {
        if(buffer[i] < 64 || buffer[i + 1] < 64 || buffer[i + 2] < 64) {
            float r = buffer[i] * (1.0f + factor);
            float g = buffer[i + 1] * (1.0f + factor);
            float b = buffer[i + 2] * (1.0f + factor);
            
            buffer[i] = r > 255 ? 255 : (uint8_t)r;
            buffer[i + 1] = g > 255 ? 255 : (uint8_t)g;
            buffer[i + 2] = b > 255 ? 255 : (uint8_t)b;
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void apply_crop(uint8_t* buffer, int width, int height, 
                int x, int y, int crop_width, int crop_height, int is_round) {
    uint8_t* new_buffer = malloc(crop_width * crop_height * 4);
    int new_size = crop_width * crop_height * 4;
    
    for(int ny = 0; ny < crop_height; ny++) {
        for(int nx = 0; nx < crop_width; nx++) {
            int new_idx = (ny * crop_width + nx) * 4;
            int old_idx = ((y + ny) * width + (x + nx)) * 4;
            
            if (is_round) {
                // Calculate distance from center for round crop
                float center_x = crop_width / 2.0f;
                float center_y = crop_height / 2.0f;
                float dx = nx - center_x;
                float dy = ny - center_y;
                float distance = sqrt(dx * dx + dy * dy);
                
                if (distance <= center_x) {
                    // Inside circle
                    memcpy(&new_buffer[new_idx], &buffer[old_idx], 4);
                } else {
                    // Outside circle - transparent
                    new_buffer[new_idx] = 0;
                    new_buffer[new_idx + 1] = 0;
                    new_buffer[new_idx + 2] = 0;
                    new_buffer[new_idx + 3] = 0;
                }
            } else {
                // Square crop - direct copy
                memcpy(&new_buffer[new_idx], &buffer[old_idx], 4);
            }
        }
    }
    
    // Copy back to original buffer
    memcpy(buffer, new_buffer, new_size);
    free(new_buffer);
}

EMSCRIPTEN_KEEPALIVE
uint8_t* apply_quality_scale(uint8_t* buffer, int width, int height, float scale) {
    int new_width = (int)(width * scale);
    int new_height = (int)(height * scale);
    uint8_t* new_buffer = malloc(new_width * new_height * 4);
    
    for(int y = 0; y < new_height; y++) {
        for(int x = 0; x < new_width; x++) {
            // Calculate source coordinates
            float src_x = x / scale;
            float src_y = y / scale;
            
            // Get integer parts
            int src_x_int = (int)src_x;
            int src_y_int = (int)src_y;
            
            // Get fractional parts
            float fx = src_x - src_x_int;
            float fy = src_y - src_y_int;
            
            // Bilinear interpolation
            int src_idx = (src_y_int * width + src_x_int) * 4;
            int src_idx_x = src_idx + (src_x_int < width - 1 ? 4 : 0);
            int src_idx_y = src_idx + (src_y_int < height - 1 ? width * 4 : 0);
            int src_idx_xy = src_idx_x + (src_y_int < height - 1 ? width * 4 : 0);
            
            for(int c = 0; c < 4; c++) {
                float p00 = buffer[src_idx + c];
                float p10 = buffer[src_idx_x + c];
                float p01 = buffer[src_idx_y + c];
                float p11 = buffer[src_idx_xy + c];
                
                // Interpolate
                float value = p00 * (1 - fx) * (1 - fy) +
                             p10 * fx * (1 - fy) +
                             p01 * (1 - fx) * fy +
                             p11 * fx * fy;
                
                new_buffer[(y * new_width + x) * 4 + c] = (uint8_t)value;
            }
        }
    }
    
    return new_buffer;
}