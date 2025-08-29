
package org.springframework.samples.petclinic.owner

import org.springframework.format.Formatter
import org.springframework.stereotype.Component
import java.text.ParseException
import java.util.Collection
import java.util.Locale

@Component
open class PetTypeFormatter(
    private val types: PetTypeRepository
) : Formatter<PetType> {

    override fun print(petType: PetType, locale: Locale): String =
        petType.getName()

    @Throws(ParseException::class)
    override fun parse(text: String, locale: Locale): PetType {
        val findPetTypes: Collection<PetType> = types.findPetTypes()
        return findPetTypes.find { it.getName() == text }
            ?: throw ParseException("type not found: $text", 0)
    }
}
