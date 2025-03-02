import { getLogger } from "@std/log/get-logger";
import { AppTokenAuthProvider, RefreshingAuthProvider } from "@twurple/auth";
import type { Config } from "../config/config.ts";

const logger = getLogger();

export class TwitchAuthManager {
  private config: Config;
  private appTokenProvider: AppTokenAuthProvider | null = null;
  private refreshingProvider: RefreshingAuthProvider | null = null;

  constructor(config: Config) {
    this.config = config;
  }

  getAppTokenProvider(): AppTokenAuthProvider {
    if (!this.appTokenProvider) {
      this.appTokenProvider = new AppTokenAuthProvider(
        this.config.clientId,
        this.config.clientSecret,
      );
      logger.info("Created AppTokenAuthProvider");
    }

    return this.appTokenProvider;
  }

  async getUserAuthProvider(): Promise<RefreshingAuthProvider> {
    if (!this.refreshingProvider) {
      if (!this.config.refreshToken) {
        logger.warn("No refresh token provided. Some features may not work correct");
      }

      this.refreshingProvider = new RefreshingAuthProvider({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      });

      if (this.config.refreshToken) {
        await this.refreshingProvider.addUserForToken({
          accessToken: this.config.accessToken,
          refreshToken: this.config.refreshToken,
          expiresIn: 0,
          obtainmentTimestamp: 0,
        }, ["chat"]);
        logger.info("Added user to RefreshingAuthProvider");
      }
    }

    return this.refreshingProvider;
  }
 
  // TODO: look into token refreshing
  private handleTokenRefresh(userId: string, newTokenData: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    obtainmentTimestamp: number;
  }): void {
    logger.info(`Refreshed tokens for user ${userId}`);

    this.config.accessToken = newTokenData.accessToken;
    this.config.refreshToken = newTokenData.refreshToken;

    logger.debug("Tokens refreshed successfully");
  }
}
