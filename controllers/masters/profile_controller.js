const profileModel = require('../../model/masters/profile_model');

/**
 * Helper function to safely parse JSON strings from the database
 * into arrays for the frontend.
 */
const parseJSON = (data) => {
    if (!data) return [];
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("JSON Parse Error:", e.message);
        return [];
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id; 
        const profile = await profileModel.getProfileById(userId);

        if (!profile) {
            return res.status(404).json({ message: "User not found" });
        }

        profile.education = parseJSON(profile.education);
        profile.experience = parseJSON(profile.experience);

        res.json(profile);
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, education, experience } = req.body;

        const payload = {
            updated_by: userId,
            updated_date: new Date()
        };

        if (name !== undefined) payload.name = name;
        if (email !== undefined) payload.email = email;

        if (education !== undefined) payload.education = JSON.stringify(education);
        if (experience !== undefined) payload.experience = JSON.stringify(experience);

        const updated = await profileModel.updateProfileById(userId, payload);

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        const freshProfile = await profileModel.getProfileById(userId);
        
        freshProfile.education = parseJSON(freshProfile.education);
        freshProfile.experience = parseJSON(freshProfile.experience);

        return res.json({
            message: "Profile updated successfully",
            profile: freshProfile
        });
    } catch (error) {
        console.error("Profile Update Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const userId = req.user.id;
        const relativePath = `uploads/profile_photos/${req.file.filename}`;

        const updated = await profileModel.updateProfileById(userId, {
            profile_photo: relativePath,
            updated_by: userId,
            updated_date: new Date()
        });

        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            message: "Profile photo updated successfully",
            photoUrl: relativePath
        });
    } catch (error) {
        console.error("Photo Upload Error:", error);
        res.status(500).json({ message: "Server error during upload" });
    }
};

// ONLY ONE EXPORT AT THE VERY BOTTOM
module.exports = { 
    getProfile, 
    updateProfile, 
    uploadPhoto 
};