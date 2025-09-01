
/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.springframework.samples.petclinic.owner

import org.springframework.util.StringUtils
import org.springframework.validation.Errors
import org.springframework.validation.Validator

/**
 * <code>Validator</code> for <code>Pet</code> forms.
 * <p>
 * We're not using Bean Validation annotations here because it is easier to define such
 * validation rule in Java.
 * </p>
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 */
open class PetValidator : Validator {

    private companion object {
        const val REQUIRED = "required"
    }

    override fun validate(obj: Any, errors: Errors) {
        val pet = obj as Pet
        val name = pet.getName()
        // name validation
        if (!StringUtils.hasText(name)) {
            errors.rejectValue("name", REQUIRED, REQUIRED)
        }

        // type validation
        if (pet.isNew() && pet.getType() == null) {
            errors.rejectValue("type", REQUIRED, REQUIRED)
        }

        // birth date validation
        if (pet.getBirthDate() == null) {
            errors.rejectValue("birthDate", REQUIRED, REQUIRED)
        }
    }

    /**
     * This Validator validates *just* Pet instances
     */
    override fun supports(clazz: Class<*>): Boolean {
        return Pet::class.java.isAssignableFrom(clazz)
    }
}
