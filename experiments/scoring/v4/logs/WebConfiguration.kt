
package org.springframework.samples.petclinic.system

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.LocaleResolver
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor
import org.springframework.web.servlet.i18n.SessionLocaleResolver

import java.util.Locale

/**
 * Configures internationalization (i18n) support for the application.
 *
 * Handles loading language-specific messages, tracking the user's language, and allowing
 * language changes via the URL parameter (e.g., `?lang=de`).
 *
 * @author Anuj Ashok Potdar
 */
@Configuration
@Suppress("unused")
class WebConfiguration : WebMvcConfigurer {

    /**
     * Uses session storage to remember the user’s language setting across requests.
     * Defaults to English if nothing is specified.
     * @return session-based [LocaleResolver]
     */
    @Bean
    fun localeResolver(): LocaleResolver {
        return SessionLocaleResolver().apply {
            setDefaultLocale(Locale.ENGLISH)
        }
    }

    /**
     * Allows the app to switch languages using a URL parameter like
     * `?lang=es`.
     * @return a [LocaleChangeInterceptor] that handles the change
     */
    @Bean
    fun localeChangeInterceptor(): LocaleChangeInterceptor =
        LocaleChangeInterceptor().apply { paramName = "lang" }

    /**
     * Registers the locale change interceptor so it can run on each request.
     * @param registry where interceptors are added
     */
    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(localeChangeInterceptor())
    }
}
