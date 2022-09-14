from model.visil import ViSiL
from datasets import load_video

# Load the two videos from the video files
query_video = load_video('/pfs/A/j1a.mp4')
target_video = load_video('/pfs/B/j1b.mp4')

# Initialize ViSiL model and load pre-trained weights
model = ViSiL('/ckpt/resnet/')

# Extract features of the two videos
query_features = model.extract_features(query_video, batch_sz=32)
target_features = model.extract_features(target_video, batch_sz=32)

# Calculate similarity between the two videos
similarity = model.calculate_video_similarity(query_features, target_features)
print(similarity)
f = open('/pfs/out/j1a - j1b.txt', 'w')
f.write(str(similarity))
f.close()