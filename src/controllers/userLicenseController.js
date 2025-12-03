const License = require('../models/License');
const User = require('../models/User');

// Issue license for current user
const issueLicense = async (req, res) => {
  try {
    // Create license for user (subscription check removed - license first, then subscribe)
    const result = await License.createForUser(req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        license: result.license ? {
          licenseKey: result.license.license_key,
          domain: result.license.domain,
          isActive: result.license.is_active,
          createdAt: result.license.created_at
        } : null
      });
    }

    res.json({
      success: true,
      message: 'ライセンスを発行しました',
      license: {
        licenseKey: result.license.license_key,
        domain: result.license.domain,
        isActive: result.license.is_active,
        createdAt: result.license.created_at
      }
    });
  } catch (error) {
    console.error('Issue license error:', error);
    res.status(500).json({
      success: false,
      error: 'ライセンス発行に失敗しました'
    });
  }
};

// Get user's license
const getUserLicense = async (req, res) => {
  try {
    const license = await License.findByUserId(req.user.id);

    if (!license) {
      return res.json({
        success: true,
        license: null
      });
    }

    res.json({
      success: true,
      license: {
        licenseKey: license.license_key,
        domain: license.domain,
        isActive: license.is_active,
        activatedAt: license.activated_at,
        createdAt: license.created_at
      }
    });
  } catch (error) {
    console.error('Get user license error:', error);
    res.status(500).json({
      success: false,
      error: 'ライセンス取得に失敗しました'
    });
  }
};

// Reset license domain (allow reactivation on different domain)
const resetLicenseDomain = async (req, res) => {
  try {
    const license = await License.findByUserId(req.user.id);

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'ライセンスが見つかりません'
      });
    }

    const updatedLicense = await License.resetDomain(license.license_key);

    res.json({
      success: true,
      message: 'ライセンスのドメイン設定をリセットしました',
      license: {
        licenseKey: updatedLicense.license_key,
        domain: updatedLicense.domain,
        isActive: updatedLicense.is_active,
        createdAt: updatedLicense.created_at
      }
    });
  } catch (error) {
    console.error('Reset license domain error:', error);
    res.status(500).json({
      success: false,
      error: 'ライセンスリセットに失敗しました'
    });
  }
};

module.exports = {
  issueLicense,
  getUserLicense,
  resetLicenseDomain
};
