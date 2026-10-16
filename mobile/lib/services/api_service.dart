import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String get baseUrl {
    const custom = String.fromEnvironment('API_URL');
    if (custom.isNotEmpty) return custom;
    // Hosted live cloud backend on Render
    return 'https://travelwise-api-cn68.onrender.com';
  }

  bool get isCloud => baseUrl.startsWith('https://');

  Future<String?> getToken() async => await _storage.read(key: 'access_token');

  Future<void> saveToken(String token) async =>
      await _storage.write(key: 'access_token', value: token);

  Future<void> clearToken() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'user_info');
  }

  // Parse user information from storage or JWT token claims
  Future<Map<String, dynamic>?> getCurrentUser() async {
    final rawUser = await _storage.read(key: 'user_info');
    if (rawUser != null && rawUser.isNotEmpty) {
      try {
        final decoded = jsonDecode(rawUser) as Map<String, dynamic>;
        return {
          'id': decoded['id']?.toString() ?? '',
          'email': decoded['email']?.toString() ?? '',
          'displayName': decoded['displayName']?.toString() ?? '',
          'role': decoded['role']?.toString() ?? 'User',
        };
      } catch (_) {}
    }

    final token = await getToken();
    if (token == null || token.isEmpty) return null;
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      String payload = parts[1];
      while (payload.length % 4 != 0) {
        payload += '=';
      }
      final decodedJson = utf8.decode(base64Url.decode(payload));
      final claims = jsonDecode(decodedJson) as Map<String, dynamic>;
      
      String role = claims['role'] ??
          claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
          'User';
      String email = claims['email'] ??
          claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
          '';

      return {
        'id': claims['sub'] ?? claims['nameid'] ?? '',
        'email': email,
        'displayName': claims['unique_name'] ?? claims['name'] ?? '',
        'role': role,
      };
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, String>> _headers() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> request(String path,
      {String method = 'GET', Map<String, dynamic>? body}) async {
    final headers = await _headers();
    final uri = Uri.parse('$baseUrl$path');
    final http.Response response;

    if (method == 'POST') {
      response = await http.post(uri, headers: headers, body: jsonEncode(body ?? {}));
    } else if (method == 'PUT') {
      response = await http.put(uri, headers: headers, body: jsonEncode(body ?? {}));
    } else if (method == 'DELETE') {
      response = await http.delete(uri, headers: headers);
    } else {
      response = await http.get(uri, headers: headers);
    }

    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      decoded = null;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final msg = decoded is Map && decoded['error'] != null
          ? decoded['error'].toString()
          : 'Request failed (${response.statusCode})';
      throw Exception(msg);
    }
    return decoded;
  }

  // Auth operations
  Future<String> login(String email, String password) async {
    final data = await request('/api/auth/login', method: 'POST', body: {
      'email': email.trim(),
      'password': password,
    });
    final token = data['access_token']?.toString();
    if (token == null) throw Exception('No access token returned by server.');
    await saveToken(token);
    if (data['user'] != null) {
      await _storage.write(key: 'user_info', value: jsonEncode(data['user']));
    }
    return token;
  }

  Future<void> register(
    String email,
    String password, {
    String role = 'User',
    String? displayName,
    String? contactPhone,
    String? serviceType,
  }) async {
    await request('/api/auth/register', method: 'POST', body: {
      'email': email.trim(),
      'password': password,
      'role': role,
      if (displayName != null) 'displayName': displayName,
      if (contactPhone != null) 'contactPhone': contactPhone,
      if (serviceType != null) 'serviceType': serviceType,
    });
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final res = await request('/api/auth/forgot-password', method: 'POST', body: {
      'email': email.trim(),
    });
    return (res as Map<String, dynamic>?) ?? {};
  }

  Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String token,
    required String newPassword,
  }) async {
    final res = await request('/api/auth/reset-password', method: 'POST', body: {
      'email': email.trim(),
      'token': token.trim(),
      'newPassword': newPassword,
    });
    return (res as Map<String, dynamic>?) ?? {};
  }

  // Trips
  Future<List<dynamic>> getTrips() async {
    final res = await request('/api/trips');
    return res as List<dynamic>;
  }

  Future<dynamic> getTrip(String tripId) async {
    return await request('/api/trips/$tripId');
  }

  Future<dynamic> createTrip({
    required String name,
    required String destination,
    required String startDate,
    required String endDate,
    String? startingPoint,
    String? travelMethod,
    String? travelVehicleType,
    bool submittedToAdmin = false,
    Map<String, dynamic>? planningDetails,
  }) async {
    return await request('/api/trips', method: 'POST', body: {
      'name': name,
      'destination': destination,
      'startDate': startDate,
      'endDate': endDate,
      if (startingPoint != null) 'startingPoint': startingPoint,
      if (travelMethod != null) 'travelMethod': travelMethod,
      if (travelVehicleType != null) 'travelVehicleType': travelVehicleType,
      'submittedToAdmin': submittedToAdmin,
      if (planningDetails != null) 'planningDetails': planningDetails,
    });
  }

  Future<dynamic> updateTrip(String tripId, Map<String, dynamic> data) async {
    return await request('/api/trips/$tripId', method: 'PUT', body: data);
  }

  // Budgets & Expenses
  Future<List<dynamic>> getBudgets(String tripId) async =>
      (await request('/api/budgets/trip/$tripId')) as List<dynamic>;

  Future<dynamic> createBudget(String tripId, double amount, {String currency = 'LKR'}) async =>
      await request('/api/budgets', method: 'POST', body: {
        'tripId': tripId,
        'amount': amount,
        'currency': currency,
      });

  Future<List<dynamic>> getExpenses(String tripId) async =>
      (await request('/api/expenses/trip/$tripId')) as List<dynamic>;

  Future<dynamic> createExpense({
    required String tripId,
    required String description,
    required double amount,
    required String paidBy,
    String currency = 'LKR',
  }) async =>
      await request('/api/expenses', method: 'POST', body: {
        'tripId': tripId,
        'description': description,
        'amount': amount,
        'paidBy': paidBy,
        'currency': currency,
      });

  // Activities & Risks
  Future<List<dynamic>> getActivities(String tripId) async =>
      (await request('/api/activities/trip/$tripId')) as List<dynamic>;

  Future<dynamic> createActivity({
    required String tripId,
    required String name,
    required String location,
    required String startAt,
    required String endAt,
  }) async =>
      await request('/api/activities', method: 'POST', body: {
        'tripId': tripId,
        'name': name,
        'location': location,
        'startAt': startAt,
        'endAt': endAt,
      });

  Future<List<dynamic>> getRisks(String tripId) async =>
      (await request('/api/risks/trip/$tripId')) as List<dynamic>;

  // Groups & Debt Settlements
  Future<List<dynamic>> getGroupMembers(String tripId) async =>
      (await request('/api/groups/$tripId/members')) as List<dynamic>;

  Future<dynamic> addGroupMember(String tripId, String displayName, String email) async =>
      await request('/api/groups/members', method: 'POST', body: {
        'tripId': tripId,
        'displayName': displayName,
        'email': email,
      });

  Future<Map<String, dynamic>?> getSettlement(String tripId) async {
    try {
      final res = await request('/api/settlements/trip/$tripId');
      return res as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  // AI Workflow
  Future<Map<String, dynamic>> startWorkflow(String tripId, String objective) async {
    final res = await request('/api/workflows', method: 'POST', body: {
      'tripId': tripId,
      'objective': objective,
    });
    return res as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> submitApproval(String workflowId, bool approved, String comment) async {
    final res = await request('/api/workflows/$workflowId/approval', method: 'POST', body: {
      'approved': approved,
      'comment': comment,
    });
    return res as Map<String, dynamic>;
  }

  // Camera Receipt Upload
  Future<void> uploadReceipt(Uint8List imageBytes, String filename) async {
    final token = await getToken();
    if (token == null) throw Exception('Please sign in to upload receipts.');

    final uri = Uri.parse('$baseUrl/api/receipts');
    final req = http.MultipartRequest('POST', uri);
    req.headers['Authorization'] = 'Bearer $token';
    req.files.add(http.MultipartFile.fromBytes('file', imageBytes, filename: filename));

    final streamedResponse = await req.send();
    if (streamedResponse.statusCode < 200 || streamedResponse.statusCode >= 300) {
      throw Exception('Receipt upload failed with status ${streamedResponse.statusCode}');
    }
  }

  // Provider Catalog
  Future<List<dynamic>> getCatalogItems() async {
    try {
      final res = await request('/api/catalog');
      return res as List<dynamic>;
    } catch (_) {
      return [];
    }
  }

  Future<dynamic> createCatalogItem({
    required int type, // 0 = VisitingPlace, 1 = Restaurant, 2 = Accommodation
    required String name,
    required String destination,
    required String description,
    required double price,
    String? address,
    String? contact,
  }) async {
    return await request('/api/catalog', method: 'POST', body: {
      'type': type,
      'name': name,
      'destination': destination,
      'description': description,
      'price': price,
      'currency': 'LKR',
      'address': address ?? '',
      'contact': contact ?? '',
    });
  }

  // Weather & Safety
  Future<Map<String, dynamic>?> getWeather(String destination) async {
    try {
      final res = await request('/api/weather?destination=${Uri.encodeComponent(destination)}');
      return res as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  // Trip Deletion
  Future<void> deleteTrip(String tripId) async {
    await request('/api/trips/$tripId', method: 'DELETE');
  }

  // Activity Deletion
  Future<void> deleteActivity(String activityId) async {
    await request('/api/activities/$activityId', method: 'DELETE');
  }

  // Group Member Deletion
  Future<void> deleteGroupMember(String memberId) async {
    await request('/api/groups/members/$memberId', method: 'DELETE');
  }

  // Destinations & Transit
  Future<List<dynamic>> getDestinations() async {
    try {
      final res = await request('/api/destinations');
      return res as List<dynamic>;
    } catch (_) {
      return [];
    }
  }

  Future<List<dynamic>> getTransportFares() async {
    try {
      final res = await request('/api/transportfares');
      return res as List<dynamic>;
    } catch (_) {
      return [];
    }
  }

  Future<List<dynamic>> getRentalVehicles() async {
    try {
      final res = await request('/api/rentalvehicles');
      return res as List<dynamic>;
    } catch (_) {
      return [];
    }
  }

  // Password Change
  Future<void> changePassword({required String oldPassword, required String newPassword}) async {
    await request('/api/auth/change-password', method: 'POST', body: {
      'currentPassword': oldPassword,
      'newPassword': newPassword,
    });
  }

  // User Profile & Account Management
  Future<Map<String, dynamic>?> getProfile() async {
    try {
      final res = await request('/api/auth/profile');
      return res as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>> updateProfile({
    String? displayName,
    String? contactPhone,
    String? serviceType,
  }) async {
    final res = await request('/api/auth/profile', method: 'PUT', body: {
      if (displayName != null) 'displayName': displayName,
      if (contactPhone != null) 'contactPhone': contactPhone,
      if (serviceType != null) 'serviceType': serviceType,
    });
    return (res as Map<String, dynamic>?) ?? {};
  }

  Future<Map<String, dynamic>> deleteAccount({
    required String confirmationText,
    String? reason,
  }) async {
    final res = await request('/api/auth/delete-account', method: 'POST', body: {
      'confirmationText': confirmationText,
      if (reason != null) 'reason': reason,
    });
    await clearToken();
    return (res as Map<String, dynamic>?) ?? {};
  }
}
