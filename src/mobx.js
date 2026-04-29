import { makeAutoObservable, runInAction } from "mobx";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInAnonymously,
  getAuth,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  onSnapshot,
  updateDoc,
  getDocs,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

import Logger from "@/utils/logger";

const DEFAULT_USER = {
  joined: new Date(),
};

const logger = new Logger({ debugEnabled: false }); // switch to true to see console logs from firebase

class Store {
  // App Data

  todos = [];
  user = null;

  // Static Data
  // Wordpress
  blogs = [];
  blogDetails = new Map();
  blogsLoading = false;
  blogDetailsLoading = new Map();
  blogsFetched = false;

  lists = [];
  // App States
  isMobileOpen = false;
  loading = true;

  permissions = null;
  permissionsLoading = false;
  permissionsError = null;
  lastPermissionCheck = null;
  permissionCheckInProgress = null;

  isReady = false;

  constructor() {
    makeAutoObservable(this);

    this.initializeAuth();

    this.setIsMobileOpen = this.setIsMobileOpen.bind(this);

    this.upgradeAccount = this.upgradeAccount.bind(this);
    this.loginWithEmail = this.loginWithEmail.bind(this);
    this.signupWithEmail = this.signupWithEmail.bind(this);

    this.updateUser = this.updateUser.bind(this);

    // Add permission check to auth state change
    this.initializeAuth = this.initializeAuth.bind(this);
    this.checkPermissions = this.checkPermissions.bind(this);
  }

  initializeAuth() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            const newUser = {
              ...DEFAULT_USER,
              uid: user.uid,
              provider: "anonymous",
              username: "Guest",
              createdAt: new Date(),
            };
            await setDoc(userDocRef, newUser);
            runInAction(() => {
              this.user = newUser;
            });
          } else {
            runInAction(() => {
              this.user = { uid: user.uid, ...userDoc.data() };
            });
          }
          await this.checkPermissions(true);
        } catch (error) {
          console.error("Error in initializeAuth:", error);
        }
      } else {
        runInAction(() => {
          this.user = null;
          this.permissions = null;
          this.lastPermissionCheck = null;
        });
      }

      runInAction(() => {
        this.loading = false;
        this.isReady = true;
      });
    });
  }

  async checkPermissions(force = false) {
    if (!this.user) {
      return;
    }

    if (this.permissionCheckInProgress) {
      return this.permissionCheckInProgress;
    }

    if (
      !force &&
      this.permissions &&
      this.lastPermissionCheck &&
      Date.now() - this.lastPermissionCheck < 5 * 60 * 1000
    ) {
      return this.permissions;
    }

    try {
      this.permissionCheckInProgress = (async () => {
        runInAction(() => {
          this.permissionsLoading = true;
        });

        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch("/api/auth/verify", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) throw new Error("Failed to verify permissions");

        const data = await response.json();

        runInAction(() => {
          this.permissions = data;
          this.permissionsLoading = false;
          this.lastPermissionCheck = Date.now();
        });

        return data;
      })();

      const result = await this.permissionCheckInProgress;
      this.permissionCheckInProgress = null;
      return result;
    } catch (error) {
      console.error("MobX - Permission check error:", error);
      runInAction(() => {
        this.permissionsLoading = false;
        this.permissions = null;
        this.permissionCheckInProgress = null;
      });
    }
  }

  // Add computed properties for easy permission checks
  get isAdmin() {
    return this.permissions?.permissions?.isAdmin ?? false;
  }

  get isMember() {
    return this.permissions?.permissions?.isMember ?? false;
  }

  get canAccessPackages() {
    return this.permissions?.permissions?.canAccessPackages ?? false;
  }

  get unlockedPackages() {
    // First try to get from permissions if available
    const fromPermissions = this.permissions?.unlockedPackages;
    if (Array.isArray(fromPermissions) && fromPermissions.length > 0) {
      return fromPermissions;
    }

    // Fall back to user object if permissions don't have it
    return this.user?.unlockedPackages ?? [];
  }

  get userStatus() {
    return this.permissions?.status ?? "anonymous";
  }

  // GLOBAL MOBX STATE
  setIsMobileOpen(isMobileOpen) {
    runInAction(() => {
      this.isMobileOpen = isMobileOpen;
    });
  }

  async updateUser(newData) {
    try {
      const userDocRef = doc(db, "users", this.user.uid);
      await updateDoc(userDocRef, newData);
      runInAction(() => {
        this.user = { ...this.user, ...newData };
      });
    } catch (error) {
      console.error("Error updating user:", error);
    }
  }

  // WORDPRESS FUNCTIONS
  async fetchBlogs() {
    if (this.blogsLoading || this.blogsFetched) return;
    this.blogsLoading = true;
    try {
      const response = await fetch("/api/wordpress");
      if (!response.ok) throw new Error("Failed to fetch blogs");
      const data = await response.json();
      runInAction(() => {
        this.blogs = data;
        this.blogsFetched = true;
        this.blogsLoading = false;
      });
    } catch (error) {
      console.error("Error fetching blogs:", error);
      runInAction(() => {
        this.blogsLoading = false;
      });
    }
  }

  async fetchBlogDetails(slug) {
    if (this.blogDetails.has(slug)) return this.blogDetails.get(slug);
    if (this.blogDetailsLoading.get(slug)) return;

    runInAction(() => {
      this.blogDetailsLoading.set(slug, true);
    });

    try {
      const response = await fetch(`/api/wordpress?slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch blog details");
      const data = await response.json();
      runInAction(() => {
        this.blogDetails.set(slug, data);
        this.blogDetailsLoading.set(slug, false);
      });
      return data;
    } catch (error) {
      console.error("Error fetching blog details:", error);
      runInAction(() => {
        this.blogDetailsLoading.set(slug, false);
      });
    }
  }

  // Getter for checking if a specific blog's details are loading
  isBlogDetailsLoading(slug) {
    return this.blogDetailsLoading.get(slug) || false;
  }

  //
  //
  //
  //
  //
  // AUTH FUNCTIONS
  async upgradeAccount(email, password, username) {
    try {
      const credential = EmailAuthProvider.credential(email, password);
      const userCredential = await linkWithCredential(
        auth.currentUser,
        credential
      );

      const userDocRef = doc(db, "users", userCredential.user.uid);
      await updateDoc(userDocRef, {
        username,
      });

      runInAction(() => {
        this.user = {
          ...userCredential.user,
          username,
        };
      });
    } catch (error) {
      console.error("Error upgrading account:", error);
    }
  }

  signInAnonymously = async () => {
    await signInAnonymously(auth);
    logger.debug("Signed in anonymously");
  };

  async loginWithEmail({ email, password }) {
    try {
      this.loading = true;
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      runInAction(() => {
        this.user = userCredential.user;
        this.loading = false;
      });
    } catch (error) {
      console.error("Error logging in:", error);
      runInAction(() => {
        this.loading = false;
      });
      throw error;
    }
  }

  async signupWithEmail(email, password, username) {
    try {
      this.loading = true;
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Additional user properties
      const newUserProfile = {
        ...DEFAULT_USER,
        createdAt: new Date(),
        username: username,
        email: email,
        uid: userCredential.user.uid,
      };

      // Create a user profile in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), newUserProfile);

      // Send welcome email
      try {
        console.log("=== CALLING WELCOME EMAIL API ===");
        console.log("Sending data:", {
          name: username,
          email: email,
          username: username,
        });

        const emailResponse = await fetch("/api/welcomeEmail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: username,
            email: email,
            username: username,
          }),
        });

        console.log("Email API response status:", emailResponse.status);
        console.log("Email API response ok:", emailResponse.ok);

        const emailResponseData = await emailResponse.json();
        console.log("Email API response data:", emailResponseData);

        if (emailResponse.ok) {
          console.log("Welcome email sent successfully");
        } else {
          console.error("Welcome email API returned error:", emailResponseData);
        }
      } catch (emailError) {
        console.error("Error calling welcome email API:", emailError);
        // Don't throw here - we don't want email failure to break signup
      }

      runInAction(() => {
        this.user = newUserProfile;
        this.loading = false;
      });
    } catch (error) {
      console.error("Error signing up:", error);
      runInAction(() => {
        this.loading = false;
      });
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(auth); // Sign out from Firebase Authentication
      runInAction(() => {
        this.user = null; // Reset the user in the store
      });
    } catch (error) {
      console.error("Error during logout:", error);
      // Handle any errors that occur during logout
    }
  }

  async signInWithGoogle() {
    try {
      console.log("Starting Google sign-in process");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful, user:", result.user);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      console.log("User document exists:", userDoc.exists());

      let userData;

      if (!userDoc.exists()) {
        console.log("Creating new user profile");
        userData = {
          ...DEFAULT_USER,
          createdAt: new Date(),
          username: user.displayName || "New User",
          email: user.email,
          uid: user.uid,
        };

        await setDoc(userDocRef, userData);
        console.log("New user profile created:", userData);

        // Send welcome email for new Google users
        try {
          console.log("=== CALLING WELCOME EMAIL API (Google User) ===");
          console.log("Sending data:", {
            name: user.displayName || "New User",
            email: user.email,
            username: user.displayName || "New User",
          });

          const emailResponse = await fetch("/api/welcomeEmail", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: user.displayName || "New User",
              email: user.email,
              username: user.displayName || "New User",
            }),
          });

          console.log(
            "Email API response status (Google):",
            emailResponse.status
          );
          console.log("Email API response ok (Google):", emailResponse.ok);

          const emailResponseData = await emailResponse.json();
          console.log("Email API response data (Google):", emailResponseData);

          if (emailResponse.ok) {
            console.log("Welcome email sent successfully to Google user");
          } else {
            console.error(
              "Welcome email API returned error (Google):",
              emailResponseData
            );
          }
        } catch (emailError) {
          console.error(
            "Error calling welcome email API (Google user):",
            emailError
          );
          // Don't throw here - we don't want email failure to break signup
        }
      } else {
        console.log("Existing user found:", userDoc.data());
        userData = { uid: user.uid, ...userDoc.data() };
      }

      // Set the user data using runInAction with a direct reference to the store
      console.log("Setting user in MobX store:", userData);
      runInAction(() => {
        MobxStore.user = userData;
      });

      console.log("Google sign-in process completed successfully");
    } catch (error) {
      console.error("Error with Google sign-in:", error);
      throw error;
    }
  }

  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      // Handle success, such as showing a message to the user
    } catch (error) {
      console.error("Error sending password reset email:", error);
      // Handle errors, such as invalid email, etc.
    }
  }

  get isUserAnonymous() {
    return this.user && this.user.provider == "anonymous";
  }
}

const MobxStore = new Store();
export default MobxStore;
