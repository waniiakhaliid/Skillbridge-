# accounts/utils.py
import os
from django.conf import settings


def save_file_locally(file, folder):
    """
    Manually saves an uploaded file to the media folder.
    Returns a URL string that gets stored in the TextField.

    Example:
        file   = request.FILES['cnic_front']
        folder = 'cnics'
        returns '/media/cnics/ali_front.jpg'

    Later when you add Cloudinary, you only replace this
    function — nothing else in your code changes.
    """

    # Build the directory path e.g. /your-project/media/cnics/
    save_dir = os.path.join(settings.MEDIA_ROOT, folder)

    # Create the folder if it doesn't exist yet
    os.makedirs(save_dir, exist_ok=True)

    # Full path where file will be saved
    # e.g. /your-project/media/cnics/ali_front.jpg
    file_path = os.path.join(save_dir, file.name)

    # Write the file to disk chunk by chunk
    # chunks() is memory safe for large files
    with open(file_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)

    # Return the URL string to store in the TextField
    # e.g. /media/cnics/ali_front.jpg
    return f'{settings.MEDIA_URL}{folder}/{file.name}'